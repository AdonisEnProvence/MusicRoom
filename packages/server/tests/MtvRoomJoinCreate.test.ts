import Database from '@ioc:Adonis/Lucid/Database';
import { MtvWorkflowStateWithUserRelatedInformation } from '@musicroom/types';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import { datatype, name, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import { BASE_URL, initTestUtils, sleep } from './utils/TestUtils';

test.group(`Sockets synch tests. e.g on connection, on create`, (group) => {
    const {
        createUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        createSocketConnection,
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

    test("It should join room for every user's session/device after one emits CREATE_ROOM", async (assert) => {
        const roomName = random.word();
        const userID = datatype.uuid();
        let userCouldEmitAnExclusiveRoomSignal = false;

        /** Mocks */
        sinon
            .stub(ServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                return {
                    runID: datatype.uuid(),
                    workflowID,
                    state: {
                        roomID: workflowID,
                        roomCreatorUserID: datatype.uuid(),
                        playing: false,
                        name: roomName,
                        currentTrack: null,
                        userRelatedInformation: {
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
                        minimumScoreToBePlayed: 1,
                    },
                };
            });
        sinon.stub(ServerToTemporalController, 'play').callsFake(async () => {
            userCouldEmitAnExclusiveRoomSignal = true;
            console.log('play mock called');
            return;
        });
        sinon
            .stub(ServerToTemporalController, 'terminateWorkflow')
            .callsFake(async (): Promise<void> => {
                return;
            });
        /** ***** */

        /**
         * User connects two devices then create a room from one
         */
        const socketA = await createUserAndGetSocket({ userID });
        const socketB = await createSocketConnection({ userID });
        assert.equal((await Device.all()).length, 2);
        socketA.emit('CREATE_ROOM', {
            name: roomName,
            initialTracksIDs: [datatype.uuid()],
        });
        await sleep();
        assert.isNotNull(await MtvRoom.findBy('creator', userID));

        /**
         * From the other one he emits an ACTION_PLAY event
         * It achieves only if he joined the socket io server room
         */
        socketB.emit('ACTION_PLAY');
        await sleep();
        assert.equal(userCouldEmitAnExclusiveRoomSignal, true);
    });

    test('New user socket connection should join previously joined/created room', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomName = random.word();
        const socketA = await createUserAndGetSocket({
            userID: creatorUserID,
        });
        let userCouldEmitAnExclusiveRoomSignal = false;
        /** Mocks */
        sinon
            .stub(ServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                const creator = datatype.uuid();
                const state: MtvWorkflowStateWithUserRelatedInformation = {
                    roomID: workflowID,
                    roomCreatorUserID: creatorUserID,
                    playing: false,
                    name: roomName,
                    usersLength: 1,
                    currentTrack: null,
                    userRelatedInformation: {
                        userID: creator,
                        emittingDeviceID: datatype.uuid(),
                        tracksVotedFor: [],
                    },
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
            .stub(ServerToTemporalController, 'getState')
            .callsFake(async ({ workflowID, userID }) => {
                return {
                    name: roomName,
                    roomCreatorUserID: creatorUserID,
                    playing: false,
                    roomID: workflowID,
                    usersLength: 1,
                    userRelatedInformation: userID
                        ? {
                              userID,
                              emittingDeviceID: datatype.uuid(),
                              tracksVotedFor: [],
                          }
                        : null,
                    currentTrack: null,
                    tracks: null,
                    minimumScoreToBePlayed: 1,
                };
            });
        sinon.stub(ServerToTemporalController, 'play').callsFake(async () => {
            userCouldEmitAnExclusiveRoomSignal = true;
            return;
        });
        /** ***** */

        /**
         * User connects one device, then creates a room from it
         */
        socketA.emit('CREATE_ROOM', {
            name: roomName,
            initialTracksIDs: [datatype.uuid()],
        });
        await sleep();

        /**
         * User connects a new device, then emits an ACTION_PLAY
         * It achieves only if he joined the socket io server room
         * He also receives the mtvRoom's context
         */
        const socketB = {
            socket: await createSocketConnection({ userID: creatorUserID }),
        };

        socketB.socket.emit('ACTION_PLAY');
        await sleep();

        assert.isTrue(userCouldEmitAnExclusiveRoomSignal);
    });

    test(`It should joins room for every user's session/device after one emits JOIN_ROOM
    It should send USER_LENGTH_UPDATE to every already existing room members`, async (assert) => {
        const userID = datatype.uuid();
        const creatorID = datatype.uuid();
        const roomName = random.word();
        let userCouldEmitAnExclusiveRoomSignal = false;
        let state: MtvWorkflowStateWithUserRelatedInformation | undefined;

        /** Mocks */
        sinon
            .stub(ServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                state = {
                    currentTrack: null,
                    roomID: workflowID,
                    roomCreatorUserID: datatype.uuid(),
                    tracks: [
                        {
                            id: datatype.uuid(),
                            artistName: name.findName(),
                            duration: 42000,
                            title: random.words(3),
                            score: datatype.number(),
                        },
                    ],
                    playing: false,
                    name: roomName,
                    userRelatedInformation: {
                        userID: creatorID,
                        emittingDeviceID: datatype.uuid(),
                        tracksVotedFor: [],
                    },
                    minimumScoreToBePlayed: 1,
                    usersLength: 1,
                };

                return {
                    runID: datatype.uuid(),
                    workflowID: workflowID,
                    state,
                };
            });

        sinon
            .stub(ServerToTemporalController, 'joinWorkflow')
            .callsFake(async () => {
                if (state === undefined) throw new Error('State is undefined');
                state.usersLength++;
                await supertest(BASE_URL)
                    .post('/temporal/user-length-update')
                    .send({
                        ...state,
                        userRelatedInformation: null,
                    });
                await supertest(BASE_URL)
                    .post('/temporal/join')
                    .send({ state, joiningUserID: userID });
                return;
            });

        sinon.stub(ServerToTemporalController, 'play').callsFake(async () => {
            userCouldEmitAnExclusiveRoomSignal = true;
            return;
        });
        /** ***** */

        /**
         * Fisrt creatorUser creates a room
         */
        const creatorUser = await createUserAndGetSocket({
            userID: creatorID,
        });
        const creatorReceivedEvents: string[] = [];
        creatorUser.emit('CREATE_ROOM', {
            name: random.word(),
            initialTracksIDs: [datatype.uuid()],
        });
        await sleep();
        const createdRoom = await MtvRoom.findBy('creator', creatorID);
        assert.isNotNull(createdRoom);
        if (!createdRoom) throw new Error('room is undefined');

        /**
         * JoiningUser connects 2 socket and joins the createdRoom with one
         */
        creatorUser.once('USER_LENGTH_UPDATE', () => {
            creatorReceivedEvents.push('USER_LENGTH_UPDATE');
        });

        const receivedEvents: string[] = [];
        const joiningUser = {
            socketA: await createUserAndGetSocket({ userID }),
            socketB: await createSocketConnection({ userID }),
        };
        Object.values(joiningUser).forEach((socket, i) =>
            socket.once('JOIN_ROOM_CALLBACK', () => {
                receivedEvents.push(`JOIN_ROOM_CALLBACK_${i}`);
            }),
        );
        joiningUser.socketA.emit('JOIN_ROOM', { roomID: createdRoom.uuid });
        await sleep();
        console.log(receivedEvents);
        assert.isTrue(receivedEvents.includes('JOIN_ROOM_CALLBACK_0'));
        assert.isTrue(receivedEvents.includes('JOIN_ROOM_CALLBACK_1'));
        assert.equal(creatorReceivedEvents.length, 1);

        /**
         * JoiningUser emit an ACTION_PLAY with the other socket connection
         * It achieves only if he joined the socket io server room
         */
        joiningUser.socketB.emit('ACTION_PLAY');
        await sleep();
        assert.equal(userCouldEmitAnExclusiveRoomSignal, true);
    });

    test('It should handle a temporal onCreate error, by removing any entry from pg', async (assert) => {
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket({ userID });
        let roomID: undefined | string;
        const receivedEvents: string[] = [];
        socket.once('CREATE_ROOM_CALLBACK', () => {
            receivedEvents.push('CREATE_ROOM_CALLBACK');
        });
        const roomName = random.words(1);

        /** Mocks */
        sinon
            .stub(ServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                roomID = workflowID;

                /**
                 * Checking if the user is well registered in the socket-io
                 * room instance
                 */
                const connectedSockets =
                    await SocketLifecycle.getConnectedSocketToRoom(workflowID);
                assert.isTrue(connectedSockets.has(socket.id));

                throw new Error('Mocked error');
            });
        /** ***** */

        /**
         * Emit CREATE_ROOM
         */
        socket.emit('CREATE_ROOM', { name: roomName, initialTracksIDs: [] });
        await sleep();

        if (roomID === undefined) throw new Error('roomID is undefined');
        /**
         * Checking if the user has correctly been removed from the
         * room instance
         */
        const connectedSockets = await SocketLifecycle.getConnectedSocketToRoom(
            roomID,
        );
        assert.isFalse(connectedSockets.has(socket.id));
        assert.equal(connectedSockets.size, 0);

        /**
         * Even if the room hasn't been inserted checking
         * if it's really not in postgres
         */
        const roomBefore = await MtvRoom.findBy('creator', userID);
        assert.isNull(roomBefore);
    });
});
