import Database from '@ioc:Adonis/Lucid/Database';
import {
    AllClientToServerEvents,
    AllServerToClientEvents,
    MtvWorkflowState,
} from '@musicroom/types';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import { joinEveryUserDevicesToRoom } from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import Ws from 'App/Services/Ws';
import { datatype, name, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { io, Socket } from 'socket.io-client';
import supertest from 'supertest';

const BASE_URL = `http://${process.env.HOST!}:${process.env.PORT!}`;

function waitForTimeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

const sleep = async (): Promise<void> => await waitForTimeout(100);

type TypedTestSocket = Socket<AllServerToClientEvents, AllClientToServerEvents>;

let socketsConnections: TypedTestSocket[] = [];

async function createSocketConnection(
    userID: string,
    requiredEventListeners?: (socket: TypedTestSocket) => void,
): Promise<TypedTestSocket> {
    const socket = io(BASE_URL, {
        query: {
            userID,
        },
    });
    socketsConnections.push(socket);
    if (requiredEventListeners) requiredEventListeners(socket);
    await sleep();
    return socket;
}

async function createUserAndGetSocket(
    userID: string,
): Promise<TypedTestSocket> {
    await User.create({
        uuid: userID,
        nickname: random.word(),
    });
    return await createSocketConnection(userID);
}

async function disconnectSocket(socket: TypedTestSocket): Promise<void> {
    socket.disconnect();
    socketsConnections = socketsConnections.filter((el) => el.id !== socket.id);
    await sleep();
}

/**
 * User should create a room, and removes it after user disconnection
 * User should join a room
 * It should create device after user's socket connection, and removes it from base after disconnection
 * It should sent FORCED_DISCONNECTION to all users in room
 */

test.group('Rooms life cycle', (group) => {
    group.beforeEach(async () => {
        socketsConnections = [];
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        sinon.restore();
        socketsConnections.forEach((socket) => {
            socket.disconnect();
        });
        await sleep();
        await Database.rollbackGlobalTransaction();
    });

    test('On user socket connection, it should register his device in db, on disconnection removes it from db', async (assert) => {
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket(userID);

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
        const socket = await createUserAndGetSocket(userID);
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
                const state: MtvWorkflowState = {
                    roomID: workflowID, //workflowID === roomID
                    roomCreatorUserID: userID,
                    playing: false,
                    name: roomName,
                    users: [userID],
                    tracks: [
                        {
                            id: datatype.uuid(),
                            artistName: name.findName(),
                            duration: 42000,
                            title: random.words(3),
                        },
                    ],
                    currentTrack: null,
                    tracksIDsList: null,
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
        socket.emit('CREATE_ROOM', { name: roomName, initialTracksIDs: [] });
        await sleep();
        await sleep();
        const roomBefore = await MtvRoom.findBy('creator', userID);
        assert.isNotNull(roomBefore);
        //As sinon mocks the whole thing synchrounously we cannot trust the order
        assert.notEqual(
            receivedEvents.indexOf('CREATE_ROOM_SYNCHED_CALLBACK'),
            -1,
        );
        assert.notEqual(receivedEvents.indexOf('CREATE_ROOM_CALLBACK'), -1);

        /**
         * Emit disconnect
         * Expecting room to be removed from database
         */
        await disconnectSocket(socket);
        const roomAfter = await MtvRoom.findBy('creator', userID);
        assert.isNull(roomAfter);
    });

    test('It should handle a temporal onCreate error', async (assert) => {
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket(userID);
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

    test('When a room got evicted, users in it should receive a FORCED_DISCONNECTION socket event', async (assert) => {
        const userIDS = Array.from({ length: 2 }, () => datatype.uuid());
        console.log(userIDS);
        const userA = {
            userID: userIDS[0],
            socket: await createUserAndGetSocket(userIDS[0]),
        };
        const userB = {
            userID: userIDS[1],
            socket: await createUserAndGetSocket(userIDS[1]),
            receivedEvents: [] as string[],
        };
        userB.socket.once('FORCED_DISCONNECTION', () => {
            userB.receivedEvents.push('FORCED_DISCONNECTION');
        });
        const roomName = random.word();

        /** Mocks */
        sinon
            .stub(ServerToTemporalController, 'terminateWorkflow')
            .callsFake(async () => {
                return;
            });
        sinon
            .stub(ServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                return {
                    runID: datatype.uuid(),
                    workflowID,
                    state: {
                        roomID: workflowID,
                        roomCreatorUserID: userA.userID,
                        playing: false,
                        name: roomName,
                        users: [userA.userID],
                        currentTrack: null,
                        tracksIDsList: null,
                        tracks: [
                            {
                                id: datatype.uuid(),
                                artistName: name.findName(),
                                duration: 42000,
                                title: random.words(3),
                            },
                        ],
                    },
                };
            });
        sinon
            .stub(ServerToTemporalController, 'joinWorkflow')
            .callsFake(async () => {
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
        userA.socket.emit('CREATE_ROOM', {
            name: roomName,
            initialTracksIDs: [],
        });
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
        assert.equal(userB.receivedEvents[0], 'FORCED_DISCONNECTION');
        assert.isNotNull(await Device.findBy('user_id', userB.userID));
        await disconnectSocket(userB.socket);
    });

    test('It should not remove room from database, as creator has more than one device/session alive', async (assert) => {
        const userID = datatype.uuid();
        const user = {
            socketA: await createUserAndGetSocket(userID),
            socketB: await createSocketConnection(userID),
        };
        await MtvRoom.create({
            uuid: datatype.uuid(),
            runID: datatype.uuid(),
            creator: userID,
        });

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
    test("It should creates a room, and it should join room for every user's session/device after one emits JOIN_ROOM", async (assert) => {
        const userID = datatype.uuid();
        const creatorID = datatype.uuid();
        const roomName = random.word();
        let userCouldEmitAnExclusiveRoomSignal = false;

        /** Mocks */
        sinon
            .stub(ServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID }) => {
                return {
                    runID: datatype.uuid(),
                    workflowID: workflowID,
                    state: {
                        tracksIDsList: null,
                        currentTrack: null,
                        roomID: workflowID,
                        roomCreatorUserID: datatype.uuid(),
                        tracks: [
                            {
                                id: datatype.uuid(),
                                artistName: name.findName(),
                                duration: 42000,
                                title: random.words(3),
                            },
                        ],
                        playing: false,
                        name: roomName,
                        users: [creatorID],
                    },
                };
            });
        sinon
            .stub(ServerToTemporalController, 'joinWorkflow')
            .callsFake(async () => {
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
        const creatorUser = await createUserAndGetSocket(creatorID);
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
        const joiningUser = {
            socketA: await createUserAndGetSocket(userID),
            socketB: await createSocketConnection(userID),
        };
        joiningUser.socketA.emit('JOIN_ROOM', { roomID: createdRoom.uuid });
        await sleep();

        /**
         * JoiningUser emit an ACTION_PLAY with the other socket connection
         * It achieves only if he joined the socket io server room
         */
        joiningUser.socketB.emit('ACTION_PLAY');
        await sleep();
        assert.equal(userCouldEmitAnExclusiveRoomSignal, true);
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
                        tracksIDsList: null,
                        currentTrack: null,
                        users: [userID],
                        tracks: [
                            {
                                id: datatype.uuid(),
                                artistName: name.findName(),
                                duration: 42000,
                                title: random.words(3),
                            },
                        ],
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
        const socketA = await createUserAndGetSocket(userID);
        const socketB = await createSocketConnection(userID);
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
        const userID = datatype.uuid();
        const roomName = random.word();
        const socketA = await createUserAndGetSocket(userID);
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
                        tracksIDsList: null,
                        currentTrack: null,
                        users: [userID],
                        tracks: [
                            {
                                id: datatype.uuid(),
                                artistName: name.findName(),
                                duration: 42000,
                                title: random.words(3),
                            },
                        ],
                    },
                };
            });
        sinon
            .stub(ServerToTemporalController, 'joinWorkflow')
            .callsFake(async () => {
                return;
            });
        sinon
            .stub(ServerToTemporalController, 'getState')
            .callsFake(async ({ workflowID }) => {
                return {
                    name: roomName,
                    roomCreatorUserID: userID,
                    playing: false,
                    roomID: workflowID,
                    users: [userID],
                    currentTrack: null,
                    tracksIDsList: null,
                    tracks: null,
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
            socket: await createSocketConnection(userID),
        };

        socketB.socket.emit('ACTION_PLAY');
        await sleep();

        assert.isTrue(userCouldEmitAnExclusiveRoomSignal);
    });

    test('Go to next tracks events are forwarded to Temporal', async (assert) => {
        /**
         * Create a user that is member of a mtv room.
         * We want this user to send a GO_TO_NEXT_TRACK event and assert
         * that the method that forwards the event is correctly called.
         */
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket(userID);
        const mtvRoom = await MtvRoom.create({
            uuid: datatype.uuid(),
            runID: datatype.uuid(),
            creator: userID,
        });
        const creatorUser = await User.findOrFail(userID);
        await creatorUser.related('mtvRoom').associate(mtvRoom);
        await Ws.adapter().remoteJoin(socket.id, mtvRoom.uuid);

        const goToNextTrackStub = sinon
            .stub(ServerToTemporalController, 'goToNextTrack')
            .resolves();

        socket.emit('GO_TO_NEXT_TRACK');

        await sleep();

        assert.isTrue(goToNextTrackStub.calledOnce);
    });

    test('It should send back the socket related mtv room context', async (assert) => {
        /**
         * Manually create and associate room to user and socket to user
         * Then emit a GET_CONTEXT and verify that the test achieves to it
         */
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket(userID);
        const receivedEvents: string[] = [];
        socket.once('RETRIEVE_CONTEXT', () => {
            receivedEvents.push('RETRIEVE_CONTEXT');
        });
        const roomID = datatype.uuid();
        const mtvRoom = await MtvRoom.create({
            uuid: roomID,
            runID: datatype.uuid(),
            creator: userID,
        });
        const creatorUser = await User.findOrFail(userID);
        await creatorUser.related('mtvRoom').associate(mtvRoom);
        await Ws.adapter().remoteJoin(socket.id, mtvRoom.uuid);

        sinon
            .stub(ServerToTemporalController, 'getState')
            .callsFake(async () => {
                return {
                    roomID,
                    currentTrack: null,
                    name: random.word(),
                    playing: false,
                    roomCreatorUserID: userID,
                    tracks: null,
                    tracksIDsList: null,
                    users: [userID],
                };
            });

        socket.emit('GET_CONTEXT');

        await sleep();

        assert.equal(receivedEvents[0], 'RETRIEVE_CONTEXT');
    });

    test('It throw an error as no user device could join socket room', async (assert) => {
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: random.word(),
        });
        const roomID = datatype.uuid();

        const devices = await Device.createMany([
            {
                userID: userID,
                uuid: datatype.uuid(),
                socketID: datatype.uuid(),
            },
            {
                userID: userID,
                uuid: datatype.uuid(),
                socketID: datatype.uuid(),
            },
        ]);

        user.related('devices').saveMany(devices);

        try {
            await joinEveryUserDevicesToRoom(user, roomID);
        } catch ({ message }) {
            assert.equal(
                message,
                `couldn't join for any device for user ${user.uuid}`,
            );
        }
    }).timeout(10_000);
});
