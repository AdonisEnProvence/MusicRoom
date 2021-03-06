import Database from '@ioc:Adonis/Lucid/Database';
import { MtvWorkflowStateWithUserRelatedInformation } from '@musicroom/types';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import { datatype, name, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    createSpyOnClientSocketEvent,
    getDefaultMtvRoomCreateRoomArgs,
    getSocketApiAuthToken,
    initTestUtils,
    sleep,
    TEMPORAL_ADONIS_KEY_HEADER,
    TEST_MTV_TEMPORAL_LISTENER,
} from './utils/TestUtils';
/**
 * User should create a room, and removes it after user disconnection
 * User should join a room
 * It should create device after user's socket connection, and removes it from base after disconnection
 * It should sent MTV_FORCED_DISCONNECTION to all users in room
 */

test.group('Rooms life cycle', (group) => {
    const {
        createSocketConnection,
        createAuthenticatedUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        disconnectSocket,
        initSocketConnection,
        waitFor,
    } = initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        sinon.restore();
        await Database.rollbackGlobalTransaction();
    });

    test('On user socket connection, it should register his device in db, on disconnection removes it from db', async (assert) => {
        const userID = datatype.uuid();
        const socket = await createAuthenticatedUserAndGetSocket({ userID });

        /**
         * Check if only 1 device for given userID is well registered in database
         * Verify if socket.id matches
         */
        const device = await Device.query().where('user_id', userID);
        console.log(device.length);
        assert.equal(device.length, 1);
        assert.equal(device[0].socketID, socket.id);
        await disconnectSocket(socket);

        /**
         * After disconnection the device should be remove from database
         */
        assert.equal((await Device.query().where('user_id', userID)).length, 0);
    });

    test('User creates a room, receives acknowledgement, on user disconnection, it should removes the room from database', async (assert) => {
        const userID = datatype.uuid();
        const socket = await createAuthenticatedUserAndGetSocket({ userID });
        const { uuid: emittingDeviceID } = await Device.findByOrFail(
            'socket_id',
            socket.id,
        );
        const mtvCreateRoomSynchedCallbackSpy = createSpyOnClientSocketEvent(
            socket,
            'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
        );

        const mtvCreateRoomCallback = createSpyOnClientSocketEvent(
            socket,
            'MTV_CREATE_ROOM_CALLBACK',
        );
        const roomName = random.words(1);

        /** Mocks */
        sinon
            .stub(MtvServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                const state: MtvWorkflowStateWithUserRelatedInformation = {
                    roomID: workflowID, //workflowID === roomID
                    roomCreatorUserID: userID,
                    playing: false,
                    playingMode: 'BROADCAST',
                    delegationOwnerUserID: null,
                    name: roomName,
                    isOpen: true,
                    isOpenOnlyInvitedUsersCanVote: false,
                    hasTimeAndPositionConstraints: false,
                    timeConstraintIsValid: null,
                    userRelatedInformation: {
                        hasControlAndDelegationPermission: true,
                        userFitsPositionConstraint: null,
                        userHasBeenInvited: false,
                        userID,
                        emittingDeviceID,
                        tracksVotedFor: [],
                    },
                    usersLength: 1,
                    tracks: [
                        {
                            id: datatype.uuid(),
                            artistName: name.findName(),
                            duration: 42000,
                            title: random.words(3),
                            score: datatype.number(),
                        },
                    ],
                    currentTrack: null,
                    minimumScoreToBePlayed: 1,
                };

                // Simulating Use Local Activity Notify
                setImmediate(
                    async () =>
                        await supertest(BASE_URL)
                            .post(
                                urlcat(
                                    TEST_MTV_TEMPORAL_LISTENER,
                                    '/mtv-creation-acknowledgement',
                                ),
                            )
                            .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                            .send(state)
                            .expect(200),
                );

                return {
                    runID: datatype.uuid(),
                    workflowID,
                    state,
                };
            });
        /** ***** */

        /**
         * Emit MTV_CREATE_ROOM
         * Expecting it to be in database
         * Also looking for the MTV_CREATE_ROOM_CALLBACK event
         */
        const settings = getDefaultMtvRoomCreateRoomArgs({
            name: roomName,
            initialTracksIDs: [],
        });
        socket.emit('MTV_CREATE_ROOM', settings);

        await waitFor(async () => {
            const roomBefore = await MtvRoom.findBy('creator', userID);
            assert.isNotNull(roomBefore);
            //As sinon mocks the whole thing synchrounously we cannot trust the order
            assert.isTrue(mtvCreateRoomSynchedCallbackSpy.calledOnce);
            assert.isTrue(mtvCreateRoomCallback.calledOnce);
        });

        /**
         * Emit disconnect
         * Expecting room to be removed from database
         */
        await disconnectSocket(socket);

        await waitFor(async () => {
            const roomAfter = await MtvRoom.findBy('creator', userID);
            assert.isNull(roomAfter);
        });
    });

    test('When a room got evicted, users in it should receive a MTV_FORCED_DISCONNECTION socket event', async (assert) => {
        const userIDS = Array.from({ length: 2 }, () => datatype.uuid());
        console.log(userIDS);
        const userA = {
            userID: userIDS[0],
            socket: await createAuthenticatedUserAndGetSocket({
                userID: userIDS[0],
            }),
            receivedEvents: [] as string[],
        };
        const userB = {
            userID: userIDS[1],
            socket: await createAuthenticatedUserAndGetSocket({
                userID: userIDS[1],
            }),
            receivedEvents: [] as string[],
        };
        userA.socket.once('MTV_FORCED_DISCONNECTION', () => {
            userA.receivedEvents.push('MTV_FORCED_DISCONNECTION');
        });
        userB.socket.once('MTV_FORCED_DISCONNECTION', () => {
            userB.receivedEvents.push('MTV_FORCED_DISCONNECTION');
        });
        const roomName = random.word();
        let state: undefined | MtvWorkflowStateWithUserRelatedInformation;

        /** Mocks */
        sinon
            .stub(MtvServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                state = {
                    roomID: workflowID,
                    roomCreatorUserID: userA.userID,
                    playing: false,
                    name: roomName,
                    isOpen: true,
                    isOpenOnlyInvitedUsersCanVote: false,
                    hasTimeAndPositionConstraints: false,
                    timeConstraintIsValid: null,
                    playingMode: 'BROADCAST',
                    delegationOwnerUserID: null,
                    userRelatedInformation: {
                        hasControlAndDelegationPermission: true,
                        userFitsPositionConstraint: null,
                        userHasBeenInvited: false,
                        emittingDeviceID: datatype.uuid(),
                        userID: userA.userID,
                        tracksVotedFor: [],
                    },
                    usersLength: 1,
                    currentTrack: null,
                    tracks: [
                        {
                            id: datatype.uuid(),
                            artistName: name.findName(),
                            duration: 42000,
                            title: random.words(3),
                            score: datatype.number(),
                        },
                    ],
                    minimumScoreToBePlayed: 1,
                };
                return {
                    runID: datatype.uuid(),
                    workflowID,
                    state,
                };
            });
        sinon
            .stub(MtvServerToTemporalController, 'joinWorkflow')
            .callsFake(async ({ userID }) => {
                if (state === undefined) throw new Error('State is undefined');
                state.usersLength++;
                state.userRelatedInformation = {
                    userHasBeenInvited: false,
                    userFitsPositionConstraint: null,
                    userID,
                    hasControlAndDelegationPermission: true,
                    emittingDeviceID: datatype.uuid(),
                    tracksVotedFor: [],
                };
                await supertest(BASE_URL)
                    .post('/temporal/mtv/join')
                    .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                    .send({ state, joiningUserID: userB.userID })
                    .expect(200);
                return;
            });
        /** ***** */

        /**
         * Check if both users devices are in db
         * UserA creates room
         */
        const deviceA = await Device.findBy('user_id', userA.userID);
        const deviceB = await Device.findBy('socket_id', userB.socket.id);
        assert.isNotNull(deviceA);
        assert.isNotNull(deviceB);
        if (!deviceA || !deviceB)
            throw new Error('DeviceA nor DeviceB is/are undefined');
        assert.equal(deviceA.socketID, userA.socket.id);
        assert.equal(deviceB.userID, userB.userID);
        const settings = getDefaultMtvRoomCreateRoomArgs({
            name: roomName,
        });
        userA.socket.emit('MTV_CREATE_ROOM', settings);
        await sleep();

        /**
         * Check if room is in db
         * UserB joins the room
         */
        const room = await MtvRoom.findBy('creator', userA.userID);
        assert.isNotNull(room);
        if (!room) throw new Error('room is undefined');
        userB.socket.emit('MTV_JOIN_ROOM', {
            roomID: room.uuid,
        });
        await sleep();
        await room.refresh();
        await room.load('members');
        assert.equal(room.members.length, 2);

        /**
         * UserA emits disconnect
         */
        await disconnectSocket(userA.socket);

        /**
         * Check if room isn't in db
         * If UserB received MTV_FORCED_DISCONNECTION websocket event
         * If UserB device is in db
         */
        assert.isNull(await MtvRoom.findBy('creator', userA.userID));
        assert.equal(userA.receivedEvents.length, 0);
        assert.equal(userB.receivedEvents[0], 'MTV_FORCED_DISCONNECTION');
        assert.isNotNull(await Device.findBy('user_id', userB.userID));
        await disconnectSocket(userB.socket);
    });

    test('It should not remove room from database, as creator has more than one device/session alive', async (assert) => {
        const userID = datatype.uuid();

        const mtvRoomIDToAssociate = datatype.uuid();
        const socketA = await createAuthenticatedUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate,
        });
        const token = getSocketApiAuthToken(socketA);
        const socketB = await createSocketConnection({ userID, token });

        /**
         *  Check if both user's devices are in database
         *  Then emit disconnect from one device
         */
        assert.equal((await Device.query().where('user_id', userID)).length, 2);
        await disconnectSocket(socketA);

        /**
         * Check if room is still in database
         * Then emit disconnect from last device
         */
        assert.isNotNull(await MtvRoom.findBy('creator', userID));
        await disconnectSocket(socketB);

        /**
         * Check if room is not in database
         */
        assert.isNull(await MtvRoom.findBy('creator', userID));
    });

    test('It should remove zombie device after a failed remote join', async (assert) => {
        const userID = datatype.uuid();

        const socketA = await createAuthenticatedUserAndGetSocket({
            userID,
        });
        const user = await User.findOrFail(userID);
        const token = getSocketApiAuthToken(socketA);
        const socketB = await createSocketConnection({ userID, token });

        await Device.create({
            socketID: random.word(),
            uuid: datatype.uuid(),
            userID,
            name: random.word(),
        });

        /**
         *  Check if both user's devices are in database
         *  Then emit disconnect from one device
         */
        await user.refresh();
        assert.equal((await Device.query().where('user_id', userID)).length, 3);

        const roomID = datatype.uuid();
        await UserService.joinEveryUserDevicesToRoom(user, roomID);

        assert.equal((await Device.query().where('user_id', userID)).length, 2);
        const socketConnectedToRoom =
            await SocketLifecycle.getConnectedSocketToRoom(roomID);
        assert.equal(socketConnectedToRoom.size, 2);
        assert.isTrue(socketConnectedToRoom.has(socketA.id));
        assert.isTrue(socketConnectedToRoom.has(socketB.id));
    });
});
