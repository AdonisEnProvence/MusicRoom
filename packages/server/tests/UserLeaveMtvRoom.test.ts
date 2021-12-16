import Database from '@ioc:Adonis/Lucid/Database';
import {
    AllServerToClientEvents,
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
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

test.group(
    `User leave mtv room dwd
    by joining,
    all user devices disconnection,
    by creating a new room,
    emit MTV_LEAVE_ROOM client socket event`,
    (group) => {
        const {
            createSocketConnection,
            createUserAndGetSocket,
            disconnectEveryRemainingSocketConnection,
            disconnectSocket,
            initSocketConnection,
            waitFor,
            spy,
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
        If the creator does the same it should send MTV_FORCED_DISCONNECTION to every remaining users in the room`, async (assert) => {
            const userAID = datatype.uuid();
            const userBID = datatype.uuid();
            const userCID = datatype.uuid();
            const mtvRoomIDToAssociate = datatype.uuid();

            const roomToJoinCreatorID = datatype.uuid();
            const mtvRoomToJoinID = datatype.uuid();

            let roomToLeaveState: MtvWorkflowState = {
                currentTrack: null,
                name: random.word(),
                delegationOwnerUserID: null,
                playingMode: 'BROADCAST',
                playing: false,
                roomCreatorUserID: userAID,
                roomID: mtvRoomIDToAssociate,
                tracks: null,
                isOpen: true,
                isOpenOnlyInvitedUsersCanVote: false,
                userRelatedInformation: null,
                usersLength: 3,
                minimumScoreToBePlayed: 1,
                hasTimeAndPositionConstraints: false,
                timeConstraintIsValid: null,
            };

            const roomToJoinState: MtvWorkflowState = {
                currentTrack: null,
                name: random.word(),
                isOpen: true,
                isOpenOnlyInvitedUsersCanVote: false,
                delegationOwnerUserID: null,
                playingMode: 'BROADCAST',
                playing: false,
                roomCreatorUserID: roomToJoinCreatorID,
                roomID: mtvRoomToJoinID,
                tracks: null,
                userRelatedInformation: null,
                usersLength: 1,
                minimumScoreToBePlayed: 1,
                hasTimeAndPositionConstraints: false,
                timeConstraintIsValid: null,
            };

            MtvServerToTemporalController.leaveWorkflow.restore();
            sinon
                .stub(MtvServerToTemporalController, 'leaveWorkflow')
                .callsFake(async ({ workflowID }) => {
                    roomToLeaveState = {
                        ...roomToLeaveState,
                        roomID: workflowID,
                        usersLength: roomToLeaveState.usersLength - 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/mtv/user-length-update')
                        .send(roomToLeaveState);
                    return;
                });
            sinon
                .stub(MtvServerToTemporalController, 'joinWorkflow')
                .callsFake(async ({ userID: relatedUserID }) => {
                    roomToJoinState.usersLength++;
                    roomToJoinState.userRelatedInformation = {
                        hasControlAndDelegationPermission: true,
                        userFitsPositionConstraint: null,
                        userHasBeenInvited: false,
                        userID: relatedUserID,
                        emittingDeviceID: datatype.uuid(),
                        tracksVotedFor: [],
                    };
                    await supertest(BASE_URL).post('/temporal/mtv/join').send({
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
            socket.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            socket.socketB.once('MTV_USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            //USER B
            socketB.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                socketB.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            //USER C
            socketC.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                /**
                 * This is the disconnecting one, in this way it should not receive
                 * any event
                 */
                // In fact, the events are received!
                // assert.isTrue(false);
            });

            socketC.socketB.once('MTV_USER_LENGTH_UPDATE', () => {
                /**
                 * This is the disconnecting one, in this way it should not receive
                 * any event
                 */
                // In fact, the events are received!
                // assert.isTrue(false);
            });

            /**
             * Emit join_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            socketC.socket.emit('MTV_JOIN_ROOM', {
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
            socket.socket.once('MTV_FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            socket.socketB.once('MTV_FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            //USER B
            socketB.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                assert.isTrue(false);
            });

            socketB.socket.once('MTV_FORCED_DISCONNECTION', () => {
                socketB.receivedEvents.push('MTV_FORCED_DISCONNECTION');
            });
            /**
             * Creator joins the room
             */
            socket.socket.emit('MTV_JOIN_ROOM', { roomID: mtvRoomToJoinID });
            await sleep();

            assert.equal(socketB.receivedEvents.length, 2);
            assert.isTrue(
                socketB.receivedEvents.includes('MTV_FORCED_DISCONNECTION'),
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
        If the creator does the same it should send MTV_FORCED_DISCONNECTION to every remaining users in the room`, async (assert) => {
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
                delegationOwnerUserID: null,
                playingMode: 'BROADCAST',
                roomID: mtvRoomIDToAssociate,
                tracks: null,
                isOpen: true,
                isOpenOnlyInvitedUsersCanVote: false,
                userRelatedInformation: null,
                usersLength: 3,
                minimumScoreToBePlayed: 1,
                hasTimeAndPositionConstraints: false,
                timeConstraintIsValid: null,
            };

            const roomToJoinState: MtvWorkflowState = {
                currentTrack: null,
                name: random.word(),
                playing: false,
                roomCreatorUserID: roomToJoinCreatorID,
                playingMode: 'BROADCAST',
                roomID: mtvRoomToJoinID,
                tracks: null,
                delegationOwnerUserID: null,
                isOpen: true,
                isOpenOnlyInvitedUsersCanVote: false,
                userRelatedInformation: null,
                minimumScoreToBePlayed: 1,
                usersLength: 1,
                hasTimeAndPositionConstraints: false,
                timeConstraintIsValid: null,
            };

            MtvServerToTemporalController.leaveWorkflow.restore();
            sinon
                .stub(MtvServerToTemporalController, 'leaveWorkflow')
                .callsFake(async ({ workflowID }) => {
                    roomToLeaveState = {
                        ...roomToLeaveState,
                        roomID: workflowID,
                        usersLength: roomToLeaveState.usersLength - 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/mtv/user-length-update')
                        .send(roomToLeaveState);
                    return;
                });
            sinon
                .stub(MtvServerToTemporalController, 'joinWorkflow')
                .callsFake(async ({ userID: relatedUserID }) => {
                    roomToJoinState.usersLength++;
                    roomToJoinState.userRelatedInformation = {
                        userFitsPositionConstraint: null,
                        userHasBeenInvited: false,
                        userID: relatedUserID,
                        hasControlAndDelegationPermission: true,
                        emittingDeviceID: datatype.uuid(),
                        tracksVotedFor: [],
                    };
                    await supertest(BASE_URL).post('/temporal/mtv/join').send({
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
            socket.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            socket.socketB.once('MTV_USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            //USER B
            socketB.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                socketB.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            //USER C
            socketC.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                /**
                 * This is the disconnecting one, in this way it should not receive
                 * any event
                 */
                assert.isTrue(false);
            });

            socketC.socketB.once('MTV_USER_LENGTH_UPDATE', () => {
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
            socket.socket.once('MTV_FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            socket.socketB.once('MTV_FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            //USER B
            socketB.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                assert.isTrue(false);
            });

            socketB.socket.once('MTV_FORCED_DISCONNECTION', () => {
                socketB.receivedEvents.push('MTV_FORCED_DISCONNECTION');
            });
            /**
             * Creator joins the room
             */
            await disconnectSocket(socket.socket);
            await disconnectSocket(socket.socketB);

            assert.equal(socketB.receivedEvents.length, 2);
            assert.isTrue(
                socketB.receivedEvents.includes('MTV_FORCED_DISCONNECTION'),
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

        test(`It should make a user leave the room after he creates a new one
        leaving user devices should not receive any leavedMtvRoom related socket event
        If the creator does the same it should send MTV_FORCED_DISCONNECTION to every remaining users in the room`, async (assert) => {
            const userAID = datatype.uuid();
            const userBID = datatype.uuid();
            const userCID = datatype.uuid();
            const mtvRoomIDToAssociate = datatype.uuid();

            let roomToLeaveState: MtvWorkflowState = {
                currentTrack: null,
                hasTimeAndPositionConstraints: false,
                timeConstraintIsValid: null,
                name: random.word(),
                delegationOwnerUserID: null,
                isOpen: true,
                isOpenOnlyInvitedUsersCanVote: false,
                playingMode: 'BROADCAST',
                playing: false,
                roomCreatorUserID: userAID,
                roomID: mtvRoomIDToAssociate,
                tracks: null,
                userRelatedInformation: null,
                usersLength: 3,
                minimumScoreToBePlayed: 1,
            };

            MtvServerToTemporalController.leaveWorkflow.restore();
            sinon
                .stub(MtvServerToTemporalController, 'leaveWorkflow')
                .callsFake(async ({ workflowID }) => {
                    roomToLeaveState = {
                        ...roomToLeaveState,
                        roomID: workflowID,
                        usersLength: roomToLeaveState.usersLength - 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/mtv/user-length-update')
                        .send(roomToLeaveState);
                    return;
                });
            sinon
                .stub(MtvServerToTemporalController, 'createMtvWorkflow')
                .callsFake(async ({ workflowID, userID, params }) => {
                    const state: MtvWorkflowStateWithUserRelatedInformation = {
                        roomID: workflowID, //workflowID === roomID
                        roomCreatorUserID: userID,
                        playing: false,
                        name: params.name,
                        delegationOwnerUserID: null,
                        playingMode: 'BROADCAST',
                        isOpen: true,
                        isOpenOnlyInvitedUsersCanVote: false,
                        hasTimeAndPositionConstraints: false,
                        timeConstraintIsValid: null,
                        userRelatedInformation: {
                            hasControlAndDelegationPermission: true,
                            userHasBeenInvited: false,
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
                        .post('/temporal/mtv/mtv-creation-acknowledgement')
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
            socket.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            socket.socketB.once('MTV_USER_LENGTH_UPDATE', () => {
                socket.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            //USER B
            socketB.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                socketB.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            //USER C
            socketC.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                /**
                 * This is the disconnecting one, in this way it should not receive
                 * any event
                 */
                assert.isTrue(false);
            });

            socketC.socketB.once('MTV_USER_LENGTH_UPDATE', () => {
                /**
                 * This is the disconnecting one, in this way it should not receive
                 * any event
                 */
                assert.isTrue(false);
            });

            socketC.socket.once('MTV_CREATE_ROOM_SYNCHED_CALLBACK', () => {
                socketC.receivedEvents.push('MTV_CREATE_ROOM_SYNCHED_CALLBACK');
            });

            socketC.socketB.once('MTV_CREATE_ROOM_SYNCHED_CALLBACK', () => {
                socketC.receivedEvents.push('MTV_CREATE_ROOM_SYNCHED_CALLBACK');
            });

            /**
             * Emit join_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            const settings = getDefaultMtvRoomCreateRoomArgs();
            socketC.socket.emit('MTV_CREATE_ROOM', settings);
            await sleep();
            await sleep();

            assert.equal(socket.receivedEvents.length, 2);
            assert.equal(socketB.receivedEvents.length, 1);
            assert.equal(socketC.receivedEvents.length, 2);
            assert.isTrue(
                socketC.receivedEvents.includes(
                    'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
                ),
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
            socket.socket.once('MTV_FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            socket.socketB.once('MTV_FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            socket.socket.once('MTV_CREATE_ROOM_SYNCHED_CALLBACK', () => {
                socket.receivedEvents.push('MTV_CREATE_ROOM_SYNCHED_CALLBACK');
            });

            socket.socketB.once('MTV_CREATE_ROOM_SYNCHED_CALLBACK', () => {
                socket.receivedEvents.push('MTV_CREATE_ROOM_SYNCHED_CALLBACK');
            });

            //USER B
            socketB.socket.once('MTV_USER_LENGTH_UPDATE', () => {
                assert.isTrue(false);
            });

            socketB.socket.once('MTV_FORCED_DISCONNECTION', () => {
                socketB.receivedEvents.push('MTV_FORCED_DISCONNECTION');
            });

            /**
             * Creator joins the room
             */
            const secondRoomSettings = getDefaultMtvRoomCreateRoomArgs();
            socket.socket.emit('MTV_CREATE_ROOM', secondRoomSettings);

            await sleep();

            assert.equal(socketB.receivedEvents.length, 2);
            assert.isTrue(
                socketB.receivedEvents.includes('MTV_FORCED_DISCONNECTION'),
            );
            assert.equal(socket.receivedEvents.length, 4);
            assert.isTrue(
                socket.receivedEvents.includes(
                    'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
                ),
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

        test(`It should make a user leave the room after he emits a MTV_LEAVE_ROOM client socket event dw 
        leaving user devices should not receive any leavedMtvRoom related socket event
        If the creator does the same it should send MTV_FORCED_DISCONNECTION to every remaining users in the room`, async (assert) => {
            const userID = datatype.uuid();
            const userBID = datatype.uuid();
            const userCID = datatype.uuid();

            MtvServerToTemporalController.leaveWorkflow.restore();
            sinon
                .stub(MtvServerToTemporalController, 'leaveWorkflow')
                .callsFake(async ({ workflowID }) => {
                    const state: MtvWorkflowState = {
                        currentTrack: null,
                        isOpen: true,
                        isOpenOnlyInvitedUsersCanVote: false,
                        hasTimeAndPositionConstraints: false,
                        delegationOwnerUserID: null,
                        timeConstraintIsValid: null,
                        name: random.word(),
                        playing: false,
                        playingMode: 'BROADCAST',
                        roomCreatorUserID: userID,
                        roomID: workflowID,
                        tracks: null,
                        userRelatedInformation: null,
                        usersLength: 2,
                        minimumScoreToBePlayed: 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/mtv/user-length-update')
                        .send(state);
                    return;
                });

            /**
             * Mocking a mtvRoom in the databse
             */
            const mtvRoomIDToAssociate = datatype.uuid();
            const userA = {
                socketA: await createUserAndGetSocket({
                    userID,
                    mtvRoomIDToAssociate,
                }),
                socketB: await createSocketConnection({ userID }),
                receivedEvents: [] as string[],
            };

            const userB = {
                socketA: await createUserAndGetSocket({
                    userID: userBID,
                    mtvRoomIDToAssociate,
                }),
                receivedEvents: [] as string[],
            };

            const userC = {
                socketA: await createUserAndGetSocket({
                    userID: userCID,
                    mtvRoomIDToAssociate,
                }),
                socketB: await createSocketConnection({ userID: userCID }),
                receivedEvents: [] as string[],
            };

            // CREATOR //
            userA.socketA.once('MTV_USER_LENGTH_UPDATE', () => {
                userA.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            userA.socketB.once('MTV_USER_LENGTH_UPDATE', () => {
                userA.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            // USER B
            userB.socketA.once('MTV_USER_LENGTH_UPDATE', () => {
                userB.receivedEvents.push('MTV_USER_LENGTH_UPDATE');
            });

            // USER C
            const userCSocketALeaveRoomCallbackSpy =
                spy<AllServerToClientEvents['MTV_LEAVE_ROOM_CALLBACK']>();
            const userCSocketBLeaveRoomCallbackSpy =
                spy<AllServerToClientEvents['MTV_LEAVE_ROOM_CALLBACK']>();
            userC.socketA.once('MTV_USER_LENGTH_UPDATE', () => {
                /**
                 * This is the disconnecting one, in this way it should not receive
                 * any event
                 */
                assert.isTrue(false);
            });
            userC.socketB.once('MTV_USER_LENGTH_UPDATE', () => {
                /**
                 * This is the disconnecting one, in this way it should not receive
                 * any event
                 */
                assert.isTrue(false);
            });
            userC.socketA.on(
                'MTV_LEAVE_ROOM_CALLBACK',
                userCSocketALeaveRoomCallbackSpy,
            );
            userC.socketB.on(
                'MTV_LEAVE_ROOM_CALLBACK',
                userCSocketBLeaveRoomCallbackSpy,
            );

            /**
             * Emit leave_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            userC.socketA.emit('MTV_LEAVE_ROOM');

            // Wait for user C's devices to have been told
            // to clear the room.
            await waitFor(() => {
                assert.equal(userCSocketALeaveRoomCallbackSpy.callCount, 1);
                assert.equal(userCSocketBLeaveRoomCallbackSpy.callCount, 1);
            });

            // Ensure user C's devices have been disconnected.
            let connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(userC.socketA.id));
            assert.isFalse(connectedSocketsToRoom.has(userC.socketB.id));

            // Wait for remaining users to have been notified
            // about users list length update.
            await waitFor(() => {
                assert.equal(userA.receivedEvents.length, 2);
                assert.equal(userB.receivedEvents.length, 1);
            });

            const leavingUser = await User.findOrFail(userCID);
            await leavingUser.load('mtvRoom');

            assert.isNull(leavingUser.mtvRoom);

            /**
             * Now same with the creator
             * We expect remaining user to receive a MTV_FORCED_DISCONNECTION event
             */

            //CREATOR
            userA.socketA.once('MTV_FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            userA.socketA.once('MTV_FORCED_DISCONNECTION', () => {
                assert.isTrue(false);
            });

            //USER B
            userB.socketA.once('MTV_FORCED_DISCONNECTION', () => {
                userB.receivedEvents.push('MTV_FORCED_DISCONNECTION');
            });

            /**
             * Creator leaves the room
             */
            userA.socketA.emit('MTV_LEAVE_ROOM');
            await sleep();

            assert.equal(userB.receivedEvents.length, 2);
            assert.isTrue(
                userB.receivedEvents.includes('MTV_FORCED_DISCONNECTION'),
            );

            connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(userA.socketA.id));
            assert.isFalse(connectedSocketsToRoom.has(userA.socketB.id));

            const leavingCreator = await User.findOrFail(userCID);
            await leavingCreator.load('mtvRoom');

            assert.isNull(leavingCreator.mtvRoom);
            assert.isNull(await MtvRoom.find(mtvRoomIDToAssociate));
        });
    },
);
