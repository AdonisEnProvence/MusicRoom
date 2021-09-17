import Database from '@ioc:Adonis/Lucid/Database';
import { MtvWorkflowStateWithUserRelatedInformation } from '@musicroom/types';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import { datatype, name, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import {
    BASE_URL,
    getDefaultMtvRoomCreateRoomArgs,
    initTestUtils,
    sleep,
} from './utils/TestUtils';
/**
 * User should create a room, and removes it after user disconnection
 * User should join a room
 * It should create device after user's socket connection, and removes it from base after disconnection
 * It should sent FORCED_DISCONNECTION to all users in room
 */

test.group('Rooms life cycle', (group) => {
    const {
        createSocketConnection,
        createUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        disconnectSocket,
        initSocketConnection,
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
        const socket = await createUserAndGetSocket({ userID });

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
        const socket = await createUserAndGetSocket({ userID });
        const receivedEvents: string[] = [];

        socket.once('CREATE_ROOM_SYNCHED_CALLBACK', () => {
            receivedEvents.push('CREATE_ROOM_SYNCHED_CALLBACK');
        });

        socket.once('CREATE_ROOM_CALLBACK', () => {
            receivedEvents.push('CREATE_ROOM_CALLBACK');
        });
        const roomName = random.words(1);

        /** Mocks */
        sinon
            .stub(ServerToTemporalController, 'terminateWorkflow')
            .callsFake(async (): Promise<void> => {
                return;
            });
        sinon
            .stub(ServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                const state: MtvWorkflowStateWithUserRelatedInformation = {
                    roomID: workflowID, //workflowID === roomID
                    roomCreatorUserID: userID,
                    playing: false,
                    playingMode: 'BROADCAST',
                    name: roomName,
                    roomHasTimeAndPositionConstraints: false,
                    timeConstraintIsValid: null,
                    userRelatedInformation: {
                        userFitsPositionConstraint: null,
                        userID,
                        emittingDeviceID: datatype.uuid(),
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
                await supertest(BASE_URL)
                    .post('/temporal/mtv-creation-acknowledgement')
                    .send(state);

                return {
                    runID: datatype.uuid(),
                    workflowID,
                    state,
                };
            });
        /** ***** */

        /**
         * Emit CREATE_ROOM
         * Expecting it to be in database
         * Also looking for the CREATE_ROOM_CALLBACK event
         */
        const settings = getDefaultMtvRoomCreateRoomArgs({
            name: roomName,
            initialTracksIDs: [],
        });
        socket.emit('CREATE_ROOM', settings);
        await sleep();
        await sleep();
        const roomBefore = await MtvRoom.findBy('creator', userID);
        assert.isNotNull(roomBefore);
        //As sinon mocks the whole thing synchrounously we cannot trust the order
        assert.isTrue(receivedEvents.includes('CREATE_ROOM_SYNCHED_CALLBACK'));
        assert.isTrue(receivedEvents.includes('CREATE_ROOM_CALLBACK'));

        /**
         * Emit disconnect
         * Expecting room to be removed from database
         */
        await disconnectSocket(socket);
        const roomAfter = await MtvRoom.findBy('creator', userID);
        assert.isNull(roomAfter);
    });

    test('When a room got evicted, users in it should receive a FORCED_DISCONNECTION socket event', async (assert) => {
        const userIDS = Array.from({ length: 2 }, () => datatype.uuid());
        console.log(userIDS);
        const userA = {
            userID: userIDS[0],
            socket: await createUserAndGetSocket({
                userID: userIDS[0],
            }),
            receivedEvents: [] as string[],
        };
        const userB = {
            userID: userIDS[1],
            socket: await createUserAndGetSocket({
                userID: userIDS[1],
            }),
            receivedEvents: [] as string[],
        };
        userA.socket.once('FORCED_DISCONNECTION', () => {
            userA.receivedEvents.push('FORCED_DISCONNECTION');
        });
        userB.socket.once('FORCED_DISCONNECTION', () => {
            userB.receivedEvents.push('FORCED_DISCONNECTION');
        });
        const roomName = random.word();
        let state: undefined | MtvWorkflowStateWithUserRelatedInformation;

        /** Mocks */
        sinon
            .stub(ServerToTemporalController, 'terminateWorkflow')
            .callsFake(async () => {
                return;
            });
        sinon
            .stub(ServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                state = {
                    roomID: workflowID,
                    roomCreatorUserID: userA.userID,
                    playing: false,
                    name: roomName,
                    roomHasTimeAndPositionConstraints: false,
                    timeConstraintIsValid: null,
                    playingMode: 'BROADCAST',
                    userRelatedInformation: {
                        userFitsPositionConstraint: null,
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
            .stub(ServerToTemporalController, 'joinWorkflow')
            .callsFake(async ({ userID }) => {
                if (state === undefined) throw new Error('State is undefined');
                state.usersLength++;
                state.userRelatedInformation = {
                    userFitsPositionConstraint: null,
                    userID,
                    emittingDeviceID: datatype.uuid(),
                    tracksVotedFor: [],
                };
                await supertest(BASE_URL)
                    .post('/temporal/join')
                    .send({ state, joiningUserID: userB.userID });
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
        userA.socket.emit('CREATE_ROOM', settings);
        await sleep();

        /**
         * Check if room is in db
         * UserB joins the room
         */
        const room = await MtvRoom.findBy('creator', userA.userID);
        assert.isNotNull(room);
        if (!room) throw new Error('room is undefined');
        userB.socket.emit('JOIN_ROOM', {
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
         * If UserB received FORCED_DISCONNECTION websocket event
         * If UserB device is in db
         */
        assert.isNull(await MtvRoom.findBy('creator', userA.userID));
        assert.equal(userA.receivedEvents.length, 0);
        assert.equal(userB.receivedEvents[0], 'FORCED_DISCONNECTION');
        assert.isNotNull(await Device.findBy('user_id', userB.userID));
        await disconnectSocket(userB.socket);
    });

    test('It should not remove room from database, as creator has more than one device/session alive', async (assert) => {
        const userID = datatype.uuid();

        const mtvRoomIDToAssociate = datatype.uuid();
        const user = {
            socketA: await createUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate,
            }),
            socketB: await createSocketConnection({ userID }),
        };

        /** Mocks */
        sinon
            .stub(ServerToTemporalController, 'terminateWorkflow')
            .callsFake(async () => {
                return;
            });
        /** ***** */

        /**
         *  Check if both user's devices are in database
         *  Then emit disconnect from one device
         */
        assert.equal((await Device.query().where('user_id', userID)).length, 2);
        await disconnectSocket(user.socketA);

        /**
         * Check if room is still in database
         * Then emit disconnect from last device
         */
        assert.isNotNull(await MtvRoom.findBy('creator', userID));
        await disconnectSocket(user.socketB);

        /**
         * Check if room is not in database
         */
        assert.isNull(await MtvRoom.findBy('creator', userID));
    });
});
