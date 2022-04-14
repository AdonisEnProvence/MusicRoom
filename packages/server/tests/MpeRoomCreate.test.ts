import Database from '@ioc:Adonis/Lucid/Database';
import { MpeCreateWorkflowResponse } from '@musicroom/types';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import MpeRoom from 'App/Models/MpeRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    createSpyOnClientSocketEvent,
    getDefaultMpeRoomCreateRoomArgs,
    getSocketApiAuthToken,
    initTestUtils,
    TEMPORAL_ADONIS_KEY_HEADER,
    TEST_MPE_TEMPORAL_LISTENER,
} from './utils/TestUtils';

test.group(`mpe rooms relationship tests`, (group) => {
    const {
        createAuthenticatedUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        createSocketConnection,
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

    test('It should sync both user socket instance to the related mpeRooms', async (assert) => {
        const creatorUserID = datatype.uuid();
        const mpeRoomsIDs = Array.from({ length: 10 }).map(() => ({
            roomName: random.words(4),
            roomID: datatype.uuid(),
        }));

        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: mpeRoomsIDs,
        });
        const creatorToken = getSocketApiAuthToken(creatorSocket);
        const creatorSocketB = await createSocketConnection({
            userID: creatorUserID,
            token: creatorToken,
        });

        const userB = await createAuthenticatedUserAndGetSocket({
            userID: datatype.uuid(),
        });

        //testing
        let lastHasBeenHit = false;
        await Promise.all(
            mpeRoomsIDs.map(async (room, index) => {
                const connectedSockets =
                    await SocketLifecycle.getConnectedSocketToRoom(room.roomID);
                assert.isTrue(connectedSockets.has(creatorSocket.id));
                assert.isTrue(connectedSockets.has(creatorSocketB.id));
                assert.isFalse(connectedSockets.has(userB.id));

                if (index === mpeRoomsIDs.length - 1) {
                    lastHasBeenHit = true;
                }
            }),
        );

        assert.isTrue(lastHasBeenHit);
    });

    test('It should create MPE room', async (assert) => {
        const creatorUserID = datatype.uuid();
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
        });
        const creatorToken = getSocketApiAuthToken(creatorSocket);
        const creatorSocketB = await createSocketConnection({
            userID: creatorUserID,
            token: creatorToken,
        });

        const settings = getDefaultMpeRoomCreateRoomArgs();

        const creatorReceivedEvents: string[] = [];
        creatorSocket.on('MPE_CREATE_ROOM_CALLBACK', () => {
            creatorReceivedEvents.push('MPE_CREATE_ROOM_CALLBACK');
        });
        creatorSocket.on('MPE_CREATE_ROOM_SYNCED_CALLBACK', () => {
            creatorReceivedEvents.push('MPE_CREATE_ROOM_SYNCED_CALLBACK');
        });

        const creatorSocketBReceivedEvents: string[] = [];
        creatorSocket.on('MPE_CREATE_ROOM_CALLBACK', () => {
            creatorSocketBReceivedEvents.push('MPE_CREATE_ROOM_CALLBACK');
        });
        creatorSocket.on('MPE_CREATE_ROOM_SYNCED_CALLBACK', () => {
            creatorSocketBReceivedEvents.push(
                'MPE_CREATE_ROOM_SYNCED_CALLBACK',
            );
        });

        sinon
            .stub(MpeServerToTemporalController, 'createMpeWorkflow')
            .callsFake(
                async ({
                    initialTrackID,
                    name,
                    workflowID,
                    userID,
                    isOpen,
                    isOpenOnlyInvitedUsersCanEdit,
                }) => {
                    /**
                     * Checking if the user is well registered in the socket-io
                     * room instance
                     */
                    const connectedSockets =
                        await SocketLifecycle.getConnectedSocketToRoom(
                            workflowID,
                        );
                    assert.isTrue(connectedSockets.has(creatorSocket.id));
                    assert.isTrue(connectedSockets.has(creatorSocketB.id));

                    const response: MpeCreateWorkflowResponse = {
                        runID: datatype.uuid(),
                        workflowID,
                        state: {
                            name,
                            isOpen,

                            userRelatedInformation: {
                                userHasBeenInvited: false,
                                userID,
                            },
                            roomID: workflowID,
                            roomCreatorUserID: userID,
                            isOpenOnlyInvitedUsersCanEdit,
                            usersLength: 1,
                            playlistTotalDuration: 42,
                            tracks: [
                                {
                                    id: initialTrackID,
                                    artistName: random.word(),
                                    duration: 42000,
                                    title: random.words(3),
                                },
                            ],
                        },
                    };

                    await supertest(BASE_URL)
                        .post(
                            urlcat(
                                TEST_MPE_TEMPORAL_LISTENER,
                                'mpe-creation-acknowledgement',
                            ),
                        )
                        .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                        .send(response.state)
                        .expect(200);
                    return response;
                },
            );

        creatorSocket.emit('MPE_CREATE_ROOM', settings);

        await waitFor(async () => {
            const room = await MpeRoom.all();
            assert.equal(room.length, 1);
        });

        const user = await User.findOrFail(creatorUserID);
        await user.load('mpeRooms');

        if (user.mpeRooms === null) {
            assert.isTrue(false);
            throw new Error('user mpeRooms are null');
        }

        assert.equal(user.mpeRooms.length, 1);
        const createdRoom = await MpeRoom.findOrFail(user.mpeRooms[0].uuid);

        assert.equal(createdRoom.creatorID, creatorUserID);

        await createdRoom.load('members');
        await createdRoom.load('creator');

        if (createdRoom.creator === null || createdRoom.members === null) {
            assert.isTrue(false);
            throw new Error('createdRoom creator or members are or is null');
        }

        assert.equal(createdRoom.creator.uuid, creatorUserID);
        assert.equal(createdRoom.members.length, 1);
        assert.equal(createdRoom.members[0].uuid, creatorUserID);

        //Checking room creation acknowledgement through socket events
        await waitFor(() => {
            assert.equal(creatorSocketBReceivedEvents.length, 2);
            assert.equal(creatorReceivedEvents.length, 2);
        });

        assert.isTrue(
            creatorReceivedEvents.includes('MPE_CREATE_ROOM_SYNCED_CALLBACK'),
        );
        assert.isTrue(
            creatorSocketBReceivedEvents.includes(
                'MPE_CREATE_ROOM_SYNCED_CALLBACK',
            ),
        );

        assert.isTrue(
            creatorReceivedEvents.includes('MPE_CREATE_ROOM_CALLBACK'),
        );
        assert.isTrue(
            creatorSocketBReceivedEvents.includes('MPE_CREATE_ROOM_CALLBACK'),
        );
    });

    test('It should fail to create MPE room du to temporal fail reponse ', async (assert) => {
        const creatorUserID = datatype.uuid();
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
        });
        const settings = getDefaultMpeRoomCreateRoomArgs();

        let mockHasBeenCalled = false;
        sinon
            .stub(MpeServerToTemporalController, 'createMpeWorkflow')
            .callsFake(async ({ workflowID }) => {
                /**
                 * Checking if the user is well registered in the socket-io
                 * room instance
                 */
                const connectedSockets =
                    await SocketLifecycle.getConnectedSocketToRoom(workflowID);
                assert.isTrue(connectedSockets.has(creatorSocket.id));

                mockHasBeenCalled = true;
                throw new Error('temporal response fail');
            });

        let creatorFailListenerHasBeenCalled = false;
        creatorSocket.on('MPE_CREATE_ROOM_FAIL', () => {
            creatorFailListenerHasBeenCalled = true;
        });

        creatorSocket.emit('MPE_CREATE_ROOM', settings);

        await waitFor(async () => {
            assert.isTrue(mockHasBeenCalled);
        });

        const user = await User.findOrFail(creatorUserID);
        await user.load('mpeRooms');

        if (user.mpeRooms === null) {
            assert.isTrue(false);
            throw new Error('user mpeRooms are null');
        }

        assert.equal(user.mpeRooms.length, 0);

        const mpeRooms = await MpeRoom.all();
        assert.equal(mpeRooms.length, 0);

        assert.isTrue(creatorFailListenerHasBeenCalled);
    });

    test('It should fail to create MPE as name is invalid ', async (assert) => {
        const creatorUserID = datatype.uuid();
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
        });
        const settings = getDefaultMpeRoomCreateRoomArgs({
            name: '   ',
        });

        const mpeCreateRoomFail = await createSpyOnClientSocketEvent(
            creatorSocket,
            'MPE_CREATE_ROOM_FAIL',
        );

        creatorSocket.emit('MPE_CREATE_ROOM', settings);

        await waitFor(() => {
            assert.isTrue(mpeCreateRoomFail.calledOnce);
        });
    });

    test('It should fail to create MPE as name is empty ', async (assert) => {
        const creatorUserID = datatype.uuid();
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
        });
        const settings = getDefaultMpeRoomCreateRoomArgs({
            name: '',
        });

        const mpeCreateRoomFail = await createSpyOnClientSocketEvent(
            creatorSocket,
            'MPE_CREATE_ROOM_FAIL',
        );

        creatorSocket.emit('MPE_CREATE_ROOM', settings);

        await waitFor(() => {
            assert.isTrue(mpeCreateRoomFail.calledOnce);
        });
    });

    test('It should trim MPE room name', async (assert) => {
        const creatorUserID = datatype.uuid();
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
        });
        const trimmedName = `${random.word()} ${random.word()}`;
        const settings = getDefaultMpeRoomCreateRoomArgs({
            name: `         ${trimmedName}          `,
        });

        let mockHasBeenCalled = false;
        sinon
            .stub(MpeServerToTemporalController, 'createMpeWorkflow')
            .callsFake(async ({ name }) => {
                /**
                 * Checking if the user is well registered in the socket-io
                 * room instance
                 */
                assert.equal(name, trimmedName);

                mockHasBeenCalled = true;
                throw new Error('End of test');
            });

        creatorSocket.emit('MPE_CREATE_ROOM', settings);

        await waitFor(async () => {
            assert.isTrue(mockHasBeenCalled);
        });
    });

    test(`It should handle room name duplication by adding creator nickname to room name 
    It should fail to create a third room with same name`, async (assert) => {
        const creatorUserID = datatype.uuid();
        const creatorNickname = random.words(2);
        const roomName = random.words(2);

        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID: datatype.uuid(),
                    roomName,
                },
            ],
            userNickname: creatorNickname,
        });
        const creator = await User.findOrFail(creatorUserID);

        const settings = getDefaultMpeRoomCreateRoomArgs({
            name: roomName,
        });

        let mockHasBeenCalled = false;
        sinon
            .stub(MpeServerToTemporalController, 'createMpeWorkflow')
            .callsFake(
                async ({
                    workflowID,
                    initialTrackID,
                    isOpen,
                    isOpenOnlyInvitedUsersCanEdit,
                    name,
                    userID,
                }) => {
                    /**
                     * Checking if the user is well registered in the socket-io
                     * room instance
                     */
                    const connectedSockets =
                        await SocketLifecycle.getConnectedSocketToRoom(
                            workflowID,
                        );
                    assert.isTrue(connectedSockets.has(creatorSocket.id));

                    const response: MpeCreateWorkflowResponse = {
                        runID: datatype.uuid(),
                        workflowID,
                        state: {
                            name,
                            isOpen,

                            userRelatedInformation: {
                                userHasBeenInvited: false,
                                userID,
                            },
                            roomID: workflowID,
                            roomCreatorUserID: userID,
                            isOpenOnlyInvitedUsersCanEdit,
                            usersLength: 1,
                            playlistTotalDuration: 42,
                            tracks: [
                                {
                                    id: initialTrackID,
                                    artistName: random.word(),
                                    duration: 42000,
                                    title: random.words(3),
                                },
                            ],
                        },
                    };

                    mockHasBeenCalled = true;
                    return response;
                },
            );

        const receivedEvents: string[] = [];
        creatorSocket.on('MPE_CREATE_ROOM_FAIL', () => {
            receivedEvents.push('MPE_CREATE_ROOM_FAIL');
        });

        //Create room with duplicated name, should succeed change the given name
        creatorSocket.emit('MPE_CREATE_ROOM', settings);

        await waitFor(async () => {
            assert.isTrue(mockHasBeenCalled);
        });

        const allMpeRooms = await MpeRoom.all();
        assert.equal(allMpeRooms.length, 2);
        assert.equal(receivedEvents.length, 0);
        const generatedRoomName = `${roomName} (${creatorNickname})`;
        const roomWithAutoGeneratedName = await MpeRoom.findBy(
            'name',
            generatedRoomName,
        );
        assert.isNotNull(roomWithAutoGeneratedName);

        await creator.refresh();
        await creator.load('mpeRooms');

        assert.isNotNull(creator.mpeRooms);
        assert.equal(creator.mpeRooms.length, 2);

        //Third attempt to create a room with same name, should fail
        creatorSocket.emit('MPE_CREATE_ROOM', settings);

        await waitFor(() => {
            assert.equal(receivedEvents.length, 1);
        });
    });

    test('It should fail to create MPE du to invalid creation args ', async (assert) => {
        const creatorUserID = datatype.uuid();
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
        });
        const settings = getDefaultMpeRoomCreateRoomArgs({
            isOpen: false,
            isOpenOnlyInvitedUsersCanEdit: true,
        });

        let errorListenerHasBeenCalled = false;
        creatorSocket.on('MPE_CREATE_ROOM_FAIL', () => {
            errorListenerHasBeenCalled = true;
        });

        creatorSocket.emit('MPE_CREATE_ROOM', settings);

        await waitFor(() => {
            assert.isTrue(errorListenerHasBeenCalled);
        });
    });
});
