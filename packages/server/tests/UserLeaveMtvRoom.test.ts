import Database from '@ioc:Adonis/Lucid/Database';
import {
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import { datatype, name, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import { BASE_URL, initTestUtils, sleep } from './utils/TestUtils';

test.group(
    `User leave mtv room dwd
    by joining,
    all user devices disconnection,
    by creating a new room,
    emit LEAVE_ROOM client socket event`,
    (group) => {
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

        test(`It should make a user leave the room after he joins a new one
        leaving user devices should not receive any leavedMtvRoom related socket event
        If the creator does the same it should send FORCED_DISCONNECTION to every remaining users in the room`, async (assert) => {
            const userAID = datatype.uuid();
            const userBID = datatype.uuid();
            const userCID = datatype.uuid();
            const mtvRoomIDToAssociate = datatype.uuid();

            const roomToJoinCreatorID = datatype.uuid();
            const mtvRoomToJoinID = datatype.uuid();

            let roomToLeaveState: MtvWorkflowState = {
                currentTrack: null,
                name: random.word(),
                playing: false,
                roomCreatorUserID: userAID,
                roomID: mtvRoomIDToAssociate,
                tracks: null,
                userRelatedInformation: null,
                usersLength: 3,
                minimumScoreToBePlayed: 0,
            };

            const roomToJoinState: MtvWorkflowState = {
                currentTrack: null,
                name: random.word(),
                playing: false,
                roomCreatorUserID: roomToJoinCreatorID,
                roomID: mtvRoomToJoinID,
                tracks: null,
                userRelatedInformation: null,
                usersLength: 1,
                minimumScoreToBePlayed: 0,
            };

            sinon
                .stub(ServerToTemporalController, 'leaveWorkflow')
                .callsFake(async ({ workflowID }) => {
                    roomToLeaveState = {
                        ...roomToLeaveState,
                        roomID: workflowID,
                        usersLength: roomToLeaveState.usersLength - 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/user-length-update')
                        .send(roomToLeaveState);
                    return;
                });
            sinon
                .stub(ServerToTemporalController, 'terminateWorkflow')
                .callsFake(async () => {
                    return;
                });
            sinon
                .stub(ServerToTemporalController, 'joinWorkflow')
                .callsFake(async ({ userID: relatedUserID }) => {
                    roomToJoinState.usersLength++;
                    roomToJoinState.userRelatedInformation = {
                        userID: relatedUserID,
                        emittingDeviceID: datatype.uuid(),
                        tracksVotedFor: [],
                    };
                    await supertest(BASE_URL).post('/temporal/join').send({
                        state: roomToJoinState,
                        joiningUserID: relatedUserID,
                    });
                    return;
                });

            /**
             * Mocking a mtvRoom in the databse
             */

            //CREATOR
            const socket = {
                socket: await createUserAndGetSocket({
                    userID: userAID,
                    mtvRoomIDToAssociate,
                }),
                socketB: await createSocketConnection({ userID: userAID }),
                receivedEvents: [] as string[],
            };

            //ROOM TO JOIN CREATOR
            await createUserAndGetSocket({
                userID: roomToJoinCreatorID,
                mtvRoomIDToAssociate: mtvRoomToJoinID,
            });

            //USER B
            const socketB = {
                socket: await createUserAndGetSocket({
                    userID: userBID,
                    mtvRoomIDToAssociate,
                }),
                receivedEvents: [] as string[],
            };

            //USER C
            const socketC = {
                socket: await createUserAndGetSocket({
                    userID: userCID,
                    mtvRoomIDToAssociate,
                }),
                socketB: await createSocketConnection({ userID: userCID }),
                receivedEvents: [] as string[],
            };

            //CREATOR
            socket.socket.once('USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('USER_LENGTH_UPDATE');
            });

            socket.socketB.once('USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('USER_LENGTH_UPDATE');
            });

            //USER B
            socketB.socket.once('USER_LENGTH_UPDATE', () => {
                socketB.receivedEvents.push('USER_LENGTH_UPDATE');
            });

            //USER C
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
             * Emit join_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            socketC.socket.emit('JOIN_ROOM', {
                roomID: mtvRoomToJoinID,
            });
            await sleep();
            await sleep();

            assert.equal(socket.receivedEvents.length, 2);
            assert.equal(socketB.receivedEvents.length, 1);

            let connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(socketC.socket.id));
            assert.isFalse(connectedSocketsToRoom.has(socketC.socketB.id));

            const leavingUser = await User.findOrFail(userCID);
            await leavingUser.load('mtvRoom');

            assert.equal(mtvRoomToJoinID, leavingUser.mtvRoom.uuid);

            /**
             * Same with creator
             */

            //CREATOR
            socket.socket.once('FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            socket.socketB.once('FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            //USER B
            socketB.socket.once('USER_LENGTH_UPDATE', () => {
                assert.isTrue(false);
            });

            socketB.socket.once('FORCED_DISCONNECTION', () => {
                socketB.receivedEvents.push('FORCED_DISCONNECTION');
            });
            /**
             * Creator joins the room
             */
            socket.socket.emit('JOIN_ROOM', { roomID: mtvRoomToJoinID });
            await sleep();

            assert.equal(socketB.receivedEvents.length, 2);
            assert.isTrue(
                socketB.receivedEvents.includes('FORCED_DISCONNECTION'),
            );

            connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(socket.socket.id));
            assert.isFalse(connectedSocketsToRoom.has(socket.socketB.id));

            const leavingCreator = await User.findOrFail(userCID);
            await leavingCreator.load('mtvRoom');

            assert.isNotNull(leavingCreator.mtvRoom);
            assert.isNull(await MtvRoom.find(mtvRoomIDToAssociate));
        });

        test(`It should make a user leave the room after he disconnect all his device
        leaving user devices should not receive any leavedMtvRoom related socket event
        If the creator does the same it should send FORCED_DISCONNECTION to every remaining users in the room`, async (assert) => {
            const userAID = datatype.uuid();
            const userBID = datatype.uuid();
            const userCID = datatype.uuid();
            const mtvRoomIDToAssociate = datatype.uuid();

            const roomToJoinCreatorID = datatype.uuid();
            const mtvRoomToJoinID = datatype.uuid();

            let roomToLeaveState: MtvWorkflowState = {
                currentTrack: null,
                name: random.word(),
                playing: false,
                roomCreatorUserID: userAID,
                roomID: mtvRoomIDToAssociate,
                tracks: null,
                userRelatedInformation: null,
                usersLength: 3,
                minimumScoreToBePlayed: 0,
            };

            const roomToJoinState: MtvWorkflowState = {
                currentTrack: null,
                name: random.word(),
                playing: false,
                roomCreatorUserID: roomToJoinCreatorID,
                roomID: mtvRoomToJoinID,
                tracks: null,
                userRelatedInformation: null,
                minimumScoreToBePlayed: 0,
                usersLength: 1,
            };

            sinon
                .stub(ServerToTemporalController, 'leaveWorkflow')
                .callsFake(async ({ workflowID }) => {
                    roomToLeaveState = {
                        ...roomToLeaveState,
                        roomID: workflowID,
                        usersLength: roomToLeaveState.usersLength - 1,
                    };

                    console.log('*'.repeat(100));

                    await supertest(BASE_URL)
                        .post('/temporal/user-length-update')
                        .send(roomToLeaveState);
                    return;
                });
            sinon
                .stub(ServerToTemporalController, 'terminateWorkflow')
                .callsFake(async () => {
                    return;
                });
            sinon
                .stub(ServerToTemporalController, 'joinWorkflow')
                .callsFake(async ({ userID: relatedUserID }) => {
                    roomToJoinState.usersLength++;
                    roomToJoinState.userRelatedInformation = {
                        userID: relatedUserID,
                        emittingDeviceID: datatype.uuid(),
                        tracksVotedFor: [],
                    };
                    await supertest(BASE_URL).post('/temporal/join').send({
                        state: roomToJoinState,
                        joiningUserID: relatedUserID,
                    });
                    return;
                });

            /**
             * Mocking a mtvRoom in the databse
             */

            //CREATOR
            const socket = {
                socket: await createUserAndGetSocket({
                    userID: userAID,
                    mtvRoomIDToAssociate,
                }),
                socketB: await createSocketConnection({ userID: userAID }),
                receivedEvents: [] as string[],
            };

            //ROOM TO JOIN CREATOR
            await createUserAndGetSocket({
                userID: roomToJoinCreatorID,
                mtvRoomIDToAssociate: mtvRoomToJoinID,
            });

            //USER B
            const socketB = {
                socket: await createUserAndGetSocket({
                    userID: userBID,
                    mtvRoomIDToAssociate,
                }),
                receivedEvents: [] as string[],
            };

            //USER C
            const socketC = {
                socket: await createUserAndGetSocket({
                    userID: userCID,
                    mtvRoomIDToAssociate,
                }),
                socketB: await createSocketConnection({ userID: userCID }),
                receivedEvents: [] as string[],
            };

            //CREATOR
            socket.socket.once('USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('USER_LENGTH_UPDATE');
            });

            socket.socketB.once('USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('USER_LENGTH_UPDATE');
            });

            //USER B
            socketB.socket.once('USER_LENGTH_UPDATE', () => {
                socketB.receivedEvents.push('USER_LENGTH_UPDATE');
            });

            //USER C
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
             * Emit join_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            await disconnectSocket(socketC.socket);
            await disconnectSocket(socketC.socketB);

            assert.equal(socket.receivedEvents.length, 2);
            assert.equal(socketB.receivedEvents.length, 1);

            let connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(socketC.socket.id));
            assert.isFalse(connectedSocketsToRoom.has(socketC.socketB.id));

            const leavingUser = await User.findOrFail(userCID);
            await leavingUser.load('mtvRoom');

            assert.isNull(leavingUser.mtvRoom);

            /**
             * Same with creator
             */

            //CREATOR
            socket.socket.once('FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            socket.socketB.once('FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            //USER B
            socketB.socket.once('USER_LENGTH_UPDATE', () => {
                assert.isTrue(false);
            });

            socketB.socket.once('FORCED_DISCONNECTION', () => {
                socketB.receivedEvents.push('FORCED_DISCONNECTION');
            });
            /**
             * Creator joins the room
             */
            await disconnectSocket(socket.socket);
            await disconnectSocket(socket.socketB);

            assert.equal(socketB.receivedEvents.length, 2);
            assert.isTrue(
                socketB.receivedEvents.includes('FORCED_DISCONNECTION'),
            );

            connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(socket.socket.id));
            assert.isFalse(connectedSocketsToRoom.has(socket.socketB.id));

            const leavingCreator = await User.findOrFail(userCID);
            await leavingCreator.load('mtvRoom');
            assert.isNull(leavingCreator.mtvRoom);

            assert.isNull(await MtvRoom.find(mtvRoomIDToAssociate));
        });

        test(`It should make a user leave the room after he disconnect all his device
        leaving user devices should not receive any leavedMtvRoom related socket event
        If the creator does the same it should send FORCED_DISCONNECTION to every remaining users in the room`, async (assert) => {
            const userAID = datatype.uuid();
            const userBID = datatype.uuid();
            const userCID = datatype.uuid();
            const mtvRoomIDToAssociate = datatype.uuid();

            let roomToLeaveState: MtvWorkflowState = {
                currentTrack: null,
                name: random.word(),
                playing: false,
                roomCreatorUserID: userAID,
                roomID: mtvRoomIDToAssociate,
                tracks: null,
                userRelatedInformation: null,
                usersLength: 3,
                minimumScoreToBePlayed: 0,
            };

            sinon
                .stub(ServerToTemporalController, 'leaveWorkflow')
                .callsFake(async ({ workflowID }) => {
                    roomToLeaveState = {
                        ...roomToLeaveState,
                        roomID: workflowID,
                        usersLength: roomToLeaveState.usersLength - 1,
                    };

                    console.log('*'.repeat(100));

                    await supertest(BASE_URL)
                        .post('/temporal/user-length-update')
                        .send(roomToLeaveState);
                    return;
                });
            sinon
                .stub(ServerToTemporalController, 'terminateWorkflow')
                .callsFake(async () => {
                    return;
                });
            sinon
                .stub(ServerToTemporalController, 'createMtvWorkflow')
                .callsFake(async ({ workflowID, userID, roomName }) => {
                    const state: MtvWorkflowStateWithUserRelatedInformation = {
                        roomID: workflowID, //workflowID === roomID
                        roomCreatorUserID: userID,
                        playing: false,
                        name: roomName,
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
                        currentTrack: null,
                        minimumScoreToBePlayed: 0,
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

            /**
             * Mocking a mtvRoom in the databse
             */

            //CREATOR
            const socket = {
                socket: await createUserAndGetSocket({
                    userID: userAID,
                    mtvRoomIDToAssociate,
                }),
                socketB: await createSocketConnection({ userID: userAID }),
                receivedEvents: [] as string[],
            };

            //USER B
            const socketB = {
                socket: await createUserAndGetSocket({
                    userID: userBID,
                    mtvRoomIDToAssociate,
                }),
                receivedEvents: [] as string[],
            };

            //USER C
            const socketC = {
                socket: await createUserAndGetSocket({
                    userID: userCID,
                    mtvRoomIDToAssociate,
                }),
                socketB: await createSocketConnection({ userID: userCID }),
                receivedEvents: [] as string[],
            };

            //CREATOR
            socket.socket.once('USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('USER_LENGTH_UPDATE');
            });

            socket.socketB.once('USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('USER_LENGTH_UPDATE');
            });

            //USER B
            socketB.socket.once('USER_LENGTH_UPDATE', () => {
                socketB.receivedEvents.push('USER_LENGTH_UPDATE');
            });

            //USER C
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

            socketC.socket.once('CREATE_ROOM_SYNCHED_CALLBACK', () => {
                socketC.receivedEvents.push('CREATE_ROOM_SYNCHED_CALLBACK');
            });

            socketC.socketB.once('CREATE_ROOM_SYNCHED_CALLBACK', () => {
                socketC.receivedEvents.push('CREATE_ROOM_SYNCHED_CALLBACK');
            });

            /**
             * Emit join_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            socketC.socket.emit('CREATE_ROOM', {
                name: random.word(),
                initialTracksIDs: [],
            });
            await sleep();
            await sleep();

            assert.equal(socket.receivedEvents.length, 2);
            assert.equal(socketB.receivedEvents.length, 1);
            assert.equal(socketC.receivedEvents.length, 2);
            assert.isTrue(
                socketC.receivedEvents.includes('CREATE_ROOM_SYNCHED_CALLBACK'),
            );

            let connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(socketC.socket.id));
            assert.isFalse(connectedSocketsToRoom.has(socketC.socketB.id));

            const leavingUser = await User.findOrFail(userCID);
            await leavingUser.load('mtvRoom');

            assert.isNotNull(leavingUser.mtvRoom);

            /**
             * Same with creator
             */

            //CREATOR
            socket.socket.once('FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            socket.socketB.once('FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            socket.socket.once('CREATE_ROOM_SYNCHED_CALLBACK', () => {
                socket.receivedEvents.push('CREATE_ROOM_SYNCHED_CALLBACK');
            });

            socket.socketB.once('CREATE_ROOM_SYNCHED_CALLBACK', () => {
                socket.receivedEvents.push('CREATE_ROOM_SYNCHED_CALLBACK');
            });

            //USER B
            socketB.socket.once('USER_LENGTH_UPDATE', () => {
                assert.isTrue(false);
            });

            socketB.socket.once('FORCED_DISCONNECTION', () => {
                socketB.receivedEvents.push('FORCED_DISCONNECTION');
            });

            /**
             * Creator joins the room
             */
            socket.socket.emit('CREATE_ROOM', {
                initialTracksIDs: [],
                name: random.word(),
            });
            await sleep();

            assert.equal(socketB.receivedEvents.length, 2);
            assert.isTrue(
                socketB.receivedEvents.includes('FORCED_DISCONNECTION'),
            );
            assert.equal(socket.receivedEvents.length, 4);
            assert.isTrue(
                socket.receivedEvents.includes('CREATE_ROOM_SYNCHED_CALLBACK'),
            );

            connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(socket.socket.id));
            assert.isFalse(connectedSocketsToRoom.has(socket.socketB.id));

            const leavingCreator = await User.findOrFail(userCID);
            await leavingCreator.load('mtvRoom');
            assert.isNotNull(leavingCreator.mtvRoom);

            assert.isNull(await MtvRoom.find(mtvRoomIDToAssociate));
        });

        test(`It should make a user leave the room after he emits a LEAVE_ROOM client socket event dw 
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
                        userRelatedInformation: null,
                        usersLength: 2,
                        minimumScoreToBePlayed: 0,
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
                socketB: await createSocketConnection({ userID }),
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
                socketB: await createSocketConnection({ userID: userCID }),
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
            assert.isFalse(connectedSocketsToRoom.has(socketC.socketB.id));

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

            /**
             * Creator leaves the room
             */
            socket.socket.emit('LEAVE_ROOM');
            await sleep();

            assert.equal(socketB.receivedEvents.length, 2);
            assert.isTrue(
                socketB.receivedEvents.includes('FORCED_DISCONNECTION'),
            );

            connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(socket.socket.id));
            assert.isFalse(connectedSocketsToRoom.has(socket.socketB.id));

            const leavingCreator = await User.findOrFail(userCID);
            await leavingCreator.load('mtvRoom');

            assert.isNull(leavingCreator.mtvRoom);
            assert.isNull(await MtvRoom.find(mtvRoomIDToAssociate));
        });
    },
);
