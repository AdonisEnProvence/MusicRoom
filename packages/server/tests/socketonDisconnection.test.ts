import Database from '@ioc:Adonis/Lucid/Database';
import {
    AllClientToServerEvents,
    AllServerToClientEvents,
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
    UserRelatedInformation,
} from '@musicroom/types';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
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

type AvailableBrowsersMocks = 'Firefox' | 'Chrome' | 'Safari';

async function createSocketConnection(
    userID: string,
    deviceName?: string,
    browser?: AvailableBrowsersMocks,
    requiredEventListeners?: (socket: TypedTestSocket) => void,
): Promise<TypedTestSocket> {
    const query: { [key: string]: string } = {
        userID,
    };
    if (deviceName) query.deviceName = deviceName;

    const extraHeaders: { [key: string]: string } = {};
    if (browser !== undefined) {
        switch (browser) {
            case 'Chrome':
                extraHeaders[
                    'user-agent'
                ] = `Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36`;
                break;
            case 'Firefox':
                extraHeaders[
                    'user-agent'
                ] = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0`;
                break;
            case 'Safari':
                extraHeaders[
                    'user-agent'
                ] = `Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15`;
                break;
        }
    }

    const socket = io(BASE_URL, {
        query,
        extraHeaders,
    });
    socketsConnections.push(socket);
    if (requiredEventListeners) requiredEventListeners(socket);
    await sleep();
    return socket;
}

interface CreateUserAndGetSocketArgs {
    userID: string;
    deviceName?: string;
    browser?: AvailableBrowsersMocks;
    mtvRoomIDToAssociate?: string;
}

async function createUserAndGetSocket({
    userID,
    deviceName,
    browser,
    mtvRoomIDToAssociate,
}: CreateUserAndGetSocketArgs): Promise<TypedTestSocket> {
    const createdUser = await User.create({
        uuid: userID,
        nickname: random.word(),
    });
    if (mtvRoomIDToAssociate !== undefined) {
        let mtvRoomToAssociate = await MtvRoom.find(mtvRoomIDToAssociate);

        if (mtvRoomToAssociate === null) {
            mtvRoomToAssociate = await MtvRoom.create({
                uuid: mtvRoomIDToAssociate,
                runID: datatype.uuid(),
                creator: createdUser.uuid,
            });
        }
        await createdUser.related('mtvRoom').associate(mtvRoomToAssociate);
    }
    //No need to remoteJoin the created socket as SocketLifeCycle.registerDevice will do it for us
    return await createSocketConnection(userID, deviceName, browser);
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
                    name: roomName,
                    userRelatedInformation: {
                        userID,
                        emittingDeviceID: datatype.uuid(),
                    },
                    usersLength: 1,
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

    test('When a room got evicted, users in it should receive a FORCED_DISCONNECTION socket event', async (assert) => {
        const userIDS = Array.from({ length: 2 }, () => datatype.uuid());
        console.log(userIDS);
        const userA = {
            userID: userIDS[0],
            socket: await createUserAndGetSocket({ userID: userIDS[0] }),
            receivedEvents: [] as string[],
        };
        const userB = {
            userID: userIDS[1],
            socket: await createUserAndGetSocket({ userID: userIDS[1] }),
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
                    userRelatedInformation: {
                        emittingDeviceID: datatype.uuid(),
                        userID: userA.userID,
                    },
                    usersLength: 1,
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
                    userID,
                    emittingDeviceID: datatype.uuid(),
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
            socketB: await createSocketConnection(userID),
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
    test.only(`It should creates a room, and it should join room for every user's session/device after one emits JOIN_ROOM
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
                    userRelatedInformation: {
                        userID: creatorID,
                        emittingDeviceID: datatype.uuid(),
                    },
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
        const creatorUser = await createUserAndGetSocket({ userID: creatorID });
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
            socketB: await createSocketConnection(userID),
        };
        Object.values(joiningUser).forEach((socket, i) =>
            socket.once('JOIN_ROOM_CALLBACK', () => {
                receivedEvents.push(`JOIN_ROOM_CALLBACK_${i}`);
            }),
        );
        joiningUser.socketA.emit('JOIN_ROOM', { roomID: createdRoom.uuid });
        await sleep();
        console.log(receivedEvents);
        assert.notEqual(receivedEvents.indexOf('JOIN_ROOM_CALLBACK_0'), -1);
        assert.notEqual(receivedEvents.indexOf('JOIN_ROOM_CALLBACK_1'), -1);
        assert.equal(creatorReceivedEvents.length, 1);

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
                        userRelatedInformation: {
                            userID,
                            emittingDeviceID: datatype.uuid(),
                        },
                        usersLength: 1,
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
        const socketA = await createUserAndGetSocket({ userID });
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
        const creatorUserID = datatype.uuid();
        const roomName = random.word();
        const socketA = await createUserAndGetSocket({ userID: creatorUserID });
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
                    tracksIDsList: null,
                    usersLength: 1,
                    currentTrack: null,
                    userRelatedInformation: {
                        userID: creator,
                        emittingDeviceID: datatype.uuid(),
                    },
                    tracks: [
                        {
                            id: datatype.uuid(),
                            artistName: name.findName(),
                            duration: 42000,
                            title: random.words(3),
                        },
                    ],
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
                          }
                        : null,
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
            socket: await createSocketConnection(creatorUserID),
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

        const mtvRoomIDToAssociate = datatype.uuid();
        const socket = await createUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate,
        });

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
        const mtvRoomIDToAssociate = datatype.uuid();
        const socket = await createUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate,
        });
        assert.equal(1, (await MtvRoom.all()).length);
        const receivedEvents: string[] = [];

        socket.once('RETRIEVE_CONTEXT', () => {
            receivedEvents.push('RETRIEVE_CONTEXT');
        });

        sinon
            .stub(ServerToTemporalController, 'getState')
            .callsFake(async () => {
                return {
                    roomID: mtvRoomIDToAssociate,
                    currentTrack: null,
                    name: random.word(),
                    playing: false,

                    roomCreatorUserID: userID,
                    tracks: null,
                    tracksIDsList: null,
                    userRelatedInformation: null,
                    usersLength: 1,
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
                name: random.word(),
            },
            {
                userID: userID,
                uuid: datatype.uuid(),
                socketID: datatype.uuid(),
                name: random.word(),
            },
        ]);

        user.related('devices').saveMany(devices);

        try {
            await UserService.joinEveryUserDevicesToRoom(user, roomID);
        } catch ({ message }) {
            assert.equal(
                message,
                `couldn't join for any device for user ${user.uuid}`,
            );
        }
    }).timeout(10_000);

    test('It should send server socket event to the client via the UserService.emitEventInSocket', async (assert) => {
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket({ userID });
        const state: MtvWorkflowState = {
            currentTrack: null,
            name: random.word(),
            playing: false,
            roomCreatorUserID: userID,
            roomID: datatype.uuid(),
            tracks: null,
            tracksIDsList: null,
            usersLength: 1,
            userRelatedInformation: null,
        };
        const receivedEvents: string[] = [];

        socket.once('CREATE_ROOM_CALLBACK', (payload) => {
            assert.deepEqual(payload, state);
            receivedEvents.push('CREATE_ROOM_CALLBACK');
        });

        UserService.emitEventInSocket(socket.id, 'CREATE_ROOM_CALLBACK', [
            state,
        ]);

        await sleep();
        assert.notEqual(receivedEvents.indexOf('CREATE_ROOM_CALLBACK'), -1);
    });

    test('It should send to every user socket instance the CONNECTED_DEVICES_UPDATE socket event on device co/dc', async (assert) => {
        const userID = datatype.uuid();
        const socketA = {
            socket: await createUserAndGetSocket({ userID }),
            receivedEvents: [] as string[],
        };

        socketA.socket.once('CONNECTED_DEVICES_UPDATE', (devices) => {
            assert.equal(2, devices.length);
            socketA.receivedEvents.push('CONNECTED_DEVICES_UPDATE');
        });

        const socketB = {
            socket: await createSocketConnection(userID),
            receivedEvents: [] as string[],
        };

        socketA.socket.once('CONNECTED_DEVICES_UPDATE', (devices) => {
            assert.equal(1, devices.length);
            socketA.receivedEvents.push('CONNECTED_DEVICES_UPDATE');
        });

        await disconnectSocket(socketB.socket);

        assert.equal(2, socketA.receivedEvents.length);
    });

    test('It should send back the user connected device list', async (assert) => {
        const userID = datatype.uuid();
        const deviceNameA = random.word();

        const socketA = await createUserAndGetSocket({
            userID,
            deviceName: deviceNameA,
        });

        const deviceA = await Device.findBy('socket_id', socketA.id);
        assert.isNotNull(deviceA);
        if (deviceA === null) throw new Error('DeviceA should not be null');

        let callbackHasBeenCalled = false;
        await createSocketConnection(userID, undefined, 'Safari');

        socketA.emit(
            'GET_CONNECTED_DEVICES_AND_DEVICE_ID',
            ({ devices, currDeviceID }) => {
                assert.equal(deviceA.uuid, currDeviceID);

                assert.equal(2, devices.length);

                assert.isTrue(devices.some((d) => d.name === deviceNameA));

                assert.isTrue(
                    devices.some((d) => d.name === 'Web Player (Safari)'),
                );

                callbackHasBeenCalled = true;
            },
        );

        await sleep();
        assert.isTrue(callbackHasBeenCalled);
    });

    test(`It should change user emitting device
    After a socket disconnection, it should automatically assign a new emitting device`, async (assert) => {
        const userID = datatype.uuid();

        sinon
            .stub(ServerToTemporalController, 'changeUserEmittingDevice')
            .callsFake(async ({ deviceID, workflowID }) => {
                const state: MtvWorkflowState = {
                    currentTrack: null,
                    name: random.word(),
                    playing: false,
                    roomCreatorUserID: userID,
                    roomID: workflowID,
                    tracks: null,
                    tracksIDsList: null,
                    userRelatedInformation: {
                        userID: userID,
                        emittingDeviceID: deviceID,
                    },
                    usersLength: 1,
                };

                await supertest(BASE_URL)
                    .post('/temporal/change-user-emitting-device')
                    .send(state);
                return;
            });

        /**
         * Mocking a mtvRoom in the databse
         */

        const mtvRoomIDToAssociate = datatype.uuid();
        const socket = {
            socket: await createUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate,
            }),
            receivedEvents: [] as string[],
        };

        const deviceA = await Device.findBy('socket_id', socket.socket.id);
        assert.isNotNull(deviceA);
        if (deviceA === null) {
            throw new Error('device should not be null');
        }
        deviceA.isEmitting = true;
        await deviceA.save();

        const socketB = {
            socket: await createSocketConnection(userID),
            receivedEvents: [] as string[],
        };

        const deviceB = await Device.findBy('socket_id', socketB.socket.id);
        assert.isNotNull(deviceB);
        if (deviceB === null) {
            throw new Error('device should not be null');
        }

        socketB.socket.once(
            'CHANGE_EMITTING_DEVICE_CALLBACK',
            ({ userRelatedInformation }) => {
                const expectedUserRelatedInformation: UserRelatedInformation | null =
                    {
                        userID: userID,
                        emittingDeviceID: deviceB.uuid,
                    };

                assert.isNotNull(userRelatedInformation);
                if (userRelatedInformation === null)
                    throw new Error(
                        'UserRelatedInformation should not be null there',
                    );

                assert.deepEqual(
                    userRelatedInformation,
                    expectedUserRelatedInformation,
                );
                socketB.receivedEvents.push('CHANGE_EMITTING_DEVICE_CALLBACK');
            },
        );

        socket.socket.once(
            'CHANGE_EMITTING_DEVICE_CALLBACK',
            ({ userRelatedInformation }) => {
                const expectedUserRelatedInformation = {
                    userID: userID,
                    emittingDeviceID: deviceB.uuid,
                };

                assert.deepEqual(
                    userRelatedInformation,
                    expectedUserRelatedInformation,
                );
                socket.receivedEvents.push('CHANGE_EMITTING_DEVICE_CALLBACK');
            },
        );

        socket.socket.emit('CHANGE_EMITTING_DEVICE', {
            newEmittingDeviceID: deviceB.uuid,
        });
        await sleep();

        await deviceA.refresh();
        await deviceB.refresh();

        assert.equal(deviceA.isEmitting, false);
        assert.equal(deviceB.isEmitting, true);
        assert.equal(socketB.receivedEvents.length, 1);
        assert.equal(socket.receivedEvents.length, 1);

        //Test emitting device eviction auto switch
        let receivedChangeEmittingDeviceThroughEviction = false;

        socket.socket.once(
            'CHANGE_EMITTING_DEVICE_CALLBACK',
            ({ userRelatedInformation }) => {
                assert.isNotNull(userRelatedInformation);
                if (userRelatedInformation === null)
                    throw new Error('userRelatedInformations is null');
                assert.equal(
                    userRelatedInformation.emittingDeviceID,
                    deviceA.uuid,
                );
                receivedChangeEmittingDeviceThroughEviction = true;
            },
        );

        await disconnectSocket(socketB.socket);
        await sleep();

        assert.isTrue(receivedChangeEmittingDeviceThroughEviction);
        await deviceA.refresh();
        assert.isTrue(deviceA.isEmitting);
    });

    test(`It should fail change user emitting device as user is not in a mtvRoom`, async (assert) => {
        const userID = datatype.uuid();
        sinon
            .stub(ServerToTemporalController, 'changeUserEmittingDevice')
            .callsFake(async ({ deviceID, workflowID }) => {
                console.log('SALUT JE SUIS LE MOCK');
                const state: MtvWorkflowState = {
                    currentTrack: null,
                    name: random.word(),
                    playing: false,
                    roomCreatorUserID: userID,
                    roomID: workflowID,
                    tracks: null,
                    tracksIDsList: null,
                    userRelatedInformation: {
                        userID: userID,
                        emittingDeviceID: deviceID,
                    },
                    usersLength: 1,
                };

                await supertest(BASE_URL)
                    .post('/temporal/change-user-emitting-device')
                    .send(state);
                return;
            });

        const socket = {
            socket: await createUserAndGetSocket({ userID }),
            receivedEvents: [] as string[],
        };
        const socketB = {
            socket: await createSocketConnection(userID),
            receivedEvents: [] as string[],
        };
        const deviceB = await Device.findBy('socket_id', socketB.socket.id);

        assert.isNotNull(deviceB);
        if (deviceB === null) {
            throw new Error('device should not be null');
        }

        let hasNeverBeenCalled = true;

        socketB.socket.once('CHANGE_EMITTING_DEVICE_CALLBACK', () => {
            assert.isTrue(false);
            hasNeverBeenCalled = false;
        });

        socket.socket.once('CHANGE_EMITTING_DEVICE_CALLBACK', () => {
            assert.isTrue(false);
            hasNeverBeenCalled = false;
        });

        socket.socket.emit('CHANGE_EMITTING_DEVICE', {
            newEmittingDeviceID: deviceB.uuid,
        });
        await sleep();

        assert.isTrue(hasNeverBeenCalled);
    });

    test('It should fail change user emitting device as user is not the newEmittingDevice owner', async (assert) => {
        const userID = datatype.uuid();
        const secondUserID = datatype.uuid();

        sinon
            .stub(ServerToTemporalController, 'changeUserEmittingDevice')
            .callsFake(async ({ deviceID, workflowID }) => {
                const state: MtvWorkflowState = {
                    currentTrack: null,
                    name: random.word(),
                    playing: false,
                    roomCreatorUserID: userID,
                    roomID: workflowID,
                    tracks: null,
                    tracksIDsList: null,
                    userRelatedInformation: {
                        userID: userID,
                        emittingDeviceID: deviceID,
                    },
                    usersLength: 1,
                };

                await supertest(BASE_URL)
                    .post('/temporal/change-user-emitting-device')
                    .send(state);
                return;
            });

        const socket = {
            socket: await createUserAndGetSocket({ userID }),
            receivedEvents: [] as string[],
        };
        const socketB = {
            socket: await createUserAndGetSocket({ userID: secondUserID }),
            receivedEvents: [] as string[],
        };
        const deviceB = await Device.findBy('socket_id', socketB.socket.id);

        assert.isNotNull(deviceB);
        if (deviceB === null) {
            throw new Error('device should not be null');
        }

        let hasNeverBeenCalled = true;

        socketB.socket.once('CHANGE_EMITTING_DEVICE_CALLBACK', () => {
            hasNeverBeenCalled = false;
        });

        socket.socket.once('CHANGE_EMITTING_DEVICE_CALLBACK', () => {
            hasNeverBeenCalled = false;
        });

        socket.socket.emit('CHANGE_EMITTING_DEVICE', {
            newEmittingDeviceID: deviceB.uuid,
        });
        await sleep();

        assert.isTrue(hasNeverBeenCalled);
    });

    test(`It should make a user leave the room after he emits a LEAVE_ROOM client socket event
    leaving user devices should not receive any leavedMtvRoom related socket event
    If the creator does the same it should send FORCED_DISCONNECTION to every remaining users in the room`, async (assert) => {
        const userID = datatype.uuid();
        const userBID = datatype.uuid();
        const userCID = datatype.uuid();

        sinon
            .stub(ServerToTemporalController, 'terminateWorkflow')
            .callsFake(async () => {
                return;
            });
        sinon
            .stub(ServerToTemporalController, 'leaveWorkflow')
            .callsFake(async ({ workflowID }) => {
                const state: MtvWorkflowState = {
                    currentTrack: null,
                    name: random.word(),
                    playing: false,
                    roomCreatorUserID: userID,
                    roomID: workflowID,
                    tracks: null,
                    tracksIDsList: null,
                    userRelatedInformation: null,
                    usersLength: 2,
                };

                console.log('*'.repeat(100));

                await supertest(BASE_URL)
                    .post('/temporal/user-length-update')
                    .send(state);
                return;
            });

        /**
         * Mocking a mtvRoom in the databse
         */
        const mtvRoomIDToAssociate = datatype.uuid();
        const socket = {
            socket: await createUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate,
            }),
            socketB: await createSocketConnection(userID),
            receivedEvents: [] as string[],
        };

        const socketB = {
            socket: await createUserAndGetSocket({
                userID: userBID,
                mtvRoomIDToAssociate,
            }),
            receivedEvents: [] as string[],
        };

        const socketC = {
            socket: await createUserAndGetSocket({
                userID: userCID,
                mtvRoomIDToAssociate,
            }),
            socketB: await createSocketConnection(userCID),
            receivedEvents: [] as string[],
        };

        // CREATOR //
        socket.socket.once('USER_LENGTH_UPDATE', () => {
            socket.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        socket.socketB.once('USER_LENGTH_UPDATE', () => {
            socket.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        // USER B
        socketB.socket.once('USER_LENGTH_UPDATE', () => {
            socketB.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        // USER C
        socketC.socket.once('USER_LENGTH_UPDATE', () => {
            /**
             * This is the disconnecting one, in this way it should not receive
             * any event
             */
            assert.isTrue(false);
        });

        socketC.socketB.once('USER_LENGTH_UPDATE', () => {
            /**
             * This is the disconnecting one, in this way it should not receive
             * any event
             */
            assert.isTrue(false);
        });

        /**
         * Emit leave_room with socket C
         * Expect B and socket to receive USER_LENGTH_UDPATE
         * server socket event
         */
        socketC.socket.emit('LEAVE_ROOM');
        await sleep();

        assert.equal(socket.receivedEvents.length, 2);
        assert.equal(socketB.receivedEvents.length, 1);

        let connectedSocketsToRoom =
            await SocketLifecycle.getConnectedSocketToRoom(
                mtvRoomIDToAssociate,
            );
        assert.isFalse(connectedSocketsToRoom.has(socketC.socket.id));

        const leavingUser = await User.findOrFail(userCID);
        await leavingUser.load('mtvRoom');

        assert.isNull(leavingUser.mtvRoom);

        /**
         * Now same with the creator
         * We expect remaining user to receive a FORCED_DISCONNECTION event
         */

        //CREATOR
        socket.socket.once('FORCED_DISCONNECTION', () => {
            assert.isTrue(false);
        });

        socket.socket.once('FORCED_DISCONNECTION', () => {
            assert.isTrue(false);
        });

        //USER B
        socketB.socket.once('FORCED_DISCONNECTION', () => {
            socketB.receivedEvents.push('FORCED_DISCONNECTION');
        });

        //USER C
        socketC.socket.once('FORCED_DISCONNECTION', () => {
            assert.isTrue(false);
        });

        socketC.socketB.once('USER_LENGTH_UPDATE', () => {
            assert.isTrue(false);
        });

        /**
         * Creator leaves the room
         */
        socket.socket.emit('LEAVE_ROOM');
        await sleep();

        assert.equal(socket.receivedEvents.length, 2);
        console.log(socketB.receivedEvents);
        assert.equal(socketB.receivedEvents.length, 2);
        assert.notEqual(
            socketB.receivedEvents.indexOf('FORCED_DISCONNECTION'),
            -1,
        );

        connectedSocketsToRoom = await SocketLifecycle.getConnectedSocketToRoom(
            mtvRoomIDToAssociate,
        );
        assert.isFalse(connectedSocketsToRoom.has(socketC.socket.id));

        const leavingCreator = await User.findOrFail(userCID);
        await leavingCreator.load('mtvRoom');

        assert.isNull(leavingUser.mtvRoom);
        assert.isNull(await MtvRoom.find(mtvRoomIDToAssociate));
    });

    test.skip(`It should make a user leave the room after he joins a new one
    leaving user devices should not receive any leavedMtvRoom related socket event`, async (assert) => {
        const userID = datatype.uuid();
        const userBID = datatype.uuid();
        const userCID = datatype.uuid();

        sinon
            .stub(ServerToTemporalController, 'leaveWorkflow')
            .callsFake(async ({ workflowID }) => {
                const state: MtvWorkflowState = {
                    currentTrack: null,
                    name: random.word(),
                    playing: false,
                    roomCreatorUserID: userID,
                    roomID: workflowID,
                    tracks: null,
                    tracksIDsList: null,
                    userRelatedInformation: null,
                    usersLength: 2,
                };

                console.log('*'.repeat(100));

                await supertest(BASE_URL)
                    .post('/temporal/user-length-update')
                    .send(state);
                return;
            });

        /**
         * Mocking a mtvRoom in the databse
         */
        const mtvRoomIDToAssociate = datatype.uuid();
        const socket = {
            socket: await createUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate,
            }),
            receivedEvents: [] as string[],
        };

        const socketB = {
            socket: await createUserAndGetSocket({
                userID: userBID,
                mtvRoomIDToAssociate,
            }),
            receivedEvents: [] as string[],
        };

        const socketC = {
            socket: await createUserAndGetSocket({
                userID: userCID,
                mtvRoomIDToAssociate,
            }),
            socketB: await createSocketConnection(userCID),
            receivedEvents: [] as string[],
        };

        socket.socket.once('USER_LENGTH_UPDATE', () => {
            socket.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        socketB.socket.once('USER_LENGTH_UPDATE', () => {
            socketB.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        socketC.socket.once('USER_LENGTH_UPDATE', () => {
            /**
             * This is the disconnecting one, in this way it should not receive
             * any event
             */
            assert.isTrue(false);
            socketC.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        socketC.socketB.once('USER_LENGTH_UPDATE', () => {
            /**
             * This is the disconnecting one, in this way it should not receive
             * any event
             */
            assert.isTrue(false);
            socketC.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        /**
         * Emit leave_room with socket C
         * Expect B and socket to receive USER_LENGTH_UDPATE
         * server socket event
         */
        socketC.socket.emit('LEAVE_ROOM');
        await sleep();

        assert.equal(socket.receivedEvents.length, 1);
        assert.equal(socketB.receivedEvents.length, 1);
        assert.equal(socketC.receivedEvents.length, 0);

        const connectedSocketsToRoom =
            await SocketLifecycle.getConnectedSocketToRoom(
                mtvRoomIDToAssociate,
            );
        assert.isFalse(connectedSocketsToRoom.has(socketC.socket.id));

        const leavingUser = await User.findOrFail(userCID);
        await leavingUser.load('mtvRoom');

        assert.isNull(leavingUser.mtvRoom);
    });

    test.skip(`It should make a user leave the room after all his devices gets disconnected
    leaving user devices should not receive any leavedMtvRoom related socket event`, async (assert) => {
        const userID = datatype.uuid();
        const userBID = datatype.uuid();
        const userCID = datatype.uuid();

        sinon
            .stub(ServerToTemporalController, 'leaveWorkflow')
            .callsFake(async ({ workflowID }) => {
                const state: MtvWorkflowState = {
                    currentTrack: null,
                    name: random.word(),
                    playing: false,
                    roomCreatorUserID: userID,
                    roomID: workflowID,
                    tracks: null,
                    tracksIDsList: null,
                    userRelatedInformation: null,
                    usersLength: 2,
                };

                console.log('*'.repeat(100));

                await supertest(BASE_URL)
                    .post('/temporal/user-length-update')
                    .send(state);
                return;
            });

        /**
         * Mocking a mtvRoom in the databse
         */
        const mtvRoomIDToAssociate = datatype.uuid();
        const socket = {
            socket: await createUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate,
            }),
            receivedEvents: [] as string[],
        };

        const socketB = {
            socket: await createUserAndGetSocket({
                userID: userBID,
                mtvRoomIDToAssociate,
            }),
            receivedEvents: [] as string[],
        };

        const socketC = {
            socket: await createUserAndGetSocket({
                userID: userCID,
                mtvRoomIDToAssociate,
            }),
            socketB: await createSocketConnection(userCID),
            receivedEvents: [] as string[],
        };

        socket.socket.once('USER_LENGTH_UPDATE', () => {
            socket.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        socketB.socket.once('USER_LENGTH_UPDATE', () => {
            socketB.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        socketC.socket.once('USER_LENGTH_UPDATE', () => {
            /**
             * This is the disconnecting one, in this way it should not receive
             * any event
             */
            assert.isTrue(false);
            socketC.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        socketC.socketB.once('USER_LENGTH_UPDATE', () => {
            /**
             * This is the disconnecting one, in this way it should not receive
             * any event
             */
            assert.isTrue(false);
            socketC.receivedEvents.push('USER_LENGTH_UPDATE');
        });

        /**
         * Emit leave_room with socket C
         * Expect B and socket to receive USER_LENGTH_UDPATE
         * server socket event
         */
        socketC.socket.emit('LEAVE_ROOM');
        await sleep();

        assert.equal(socket.receivedEvents.length, 1);
        assert.equal(socketB.receivedEvents.length, 1);
        assert.equal(socketC.receivedEvents.length, 0);

        const connectedSocketsToRoom =
            await SocketLifecycle.getConnectedSocketToRoom(
                mtvRoomIDToAssociate,
            );
        assert.isFalse(connectedSocketsToRoom.has(socketC.socket.id));

        const leavingUser = await User.findOrFail(userCID);
        await leavingUser.load('mtvRoom');

        assert.isNull(leavingUser.mtvRoom);
    });
});
