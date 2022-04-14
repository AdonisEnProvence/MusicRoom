import Database from '@ioc:Adonis/Lucid/Database';
import {
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import { datatype, name, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import {
    BASE_URL,
    createSpyOnClientSocketEvent,
    getDefaultMtvRoomCreateRoomArgs,
    getSocketApiAuthToken,
    initTestUtils,
    MtvServerToTemporalControllerLeaveWorkflowStub,
    TEMPORAL_ADONIS_KEY_HEADER,
} from './utils/TestUtils';

test.group(
    `User leave mtv room
    by joining,
    all user devices disconnection,
    by creating a new room,
    emit MTV_LEAVE_ROOM client socket event`,
    (group) => {
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

            (
                MtvServerToTemporalController.leaveWorkflow as MtvServerToTemporalControllerLeaveWorkflowStub
            ).restore();
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
                        .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                        .send(roomToLeaveState)
                        .expect(200);
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
                    await supertest(BASE_URL)
                        .post('/temporal/mtv/join')
                        .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                        .send({
                            state: roomToJoinState,
                            joiningUserID: relatedUserID,
                        })
                        .expect(200);
                    return;
                });

            /**
             * Mocking a mtvRoom in the database
             */

            //CREATOR
            const creatorSocket = await createAuthenticatedUserAndGetSocket({
                userID: userAID,
                mtvRoomIDToAssociate,
            });
            const creatorToken = getSocketApiAuthToken(creatorSocket);
            const creatorSocketB = await createSocketConnection({
                userID: userAID,
                token: creatorToken,
            });

            //ROOM TO JOIN CREATOR
            await createAuthenticatedUserAndGetSocket({
                userID: roomToJoinCreatorID,
                mtvRoomIDToAssociate: mtvRoomToJoinID,
            });

            //USER B
            const userBSocket = await createAuthenticatedUserAndGetSocket({
                userID: userBID,
                mtvRoomIDToAssociate,
            });

            //USER C
            const userCSocket = await createAuthenticatedUserAndGetSocket({
                userID: userCID,
                mtvRoomIDToAssociate,
            });
            const userCToken = getSocketApiAuthToken(userCSocket);
            const userCSocketB = await createSocketConnection({
                userID: userCID,
                token: userCToken,
            });

            //CREATOR
            const creatorSocketUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_USER_LENGTH_UPDATE',
                );

            const creatorSocketBUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    creatorSocketB,
                    'MTV_USER_LENGTH_UPDATE',
                );

            //USER B
            const userBSocketUserLengthUpdateSpy = createSpyOnClientSocketEvent(
                userBSocket,
                'MTV_USER_LENGTH_UPDATE',
            );

            //USER C
            const userCSocketJoinRoomCallbackSpy = createSpyOnClientSocketEvent(
                userCSocket,
                'MTV_JOIN_ROOM_CALLBACK',
            );

            const userCSocketBJoinRoomCallbackSpy =
                createSpyOnClientSocketEvent(
                    userCSocketB,
                    'MTV_JOIN_ROOM_CALLBACK',
                );

            const userCSocketUserLengthUpdateSpy = createSpyOnClientSocketEvent(
                userCSocket,
                'MTV_USER_LENGTH_UPDATE',
            );

            const userCSocketBUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    userCSocketB,
                    'MTV_USER_LENGTH_UPDATE',
                );

            /**
             * Emit join_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            userCSocket.emit('MTV_JOIN_ROOM', {
                roomID: mtvRoomToJoinID,
            });

            await waitFor(async () => {
                //Creator
                assert.isTrue(creatorSocketUserLengthUpdateSpy.calledOnce);
                assert.isTrue(creatorSocketBUserLengthUpdateSpy.calledOnce);
                //UserB
                assert.isTrue(userBSocketUserLengthUpdateSpy.calledOnce);
                //UserC
                assert.isTrue(userCSocketJoinRoomCallbackSpy.calledOnce);
                assert.isTrue(userCSocketBJoinRoomCallbackSpy.calledOnce);
                assert.isTrue(userCSocketUserLengthUpdateSpy.notCalled);
                assert.isTrue(userCSocketBUserLengthUpdateSpy.notCalled);
            });

            let connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(userCSocket.id));
            assert.isFalse(connectedSocketsToRoom.has(userCSocketB.id));

            const leavingUser = await User.findOrFail(userCID);
            await leavingUser.load('mtvRoom');

            assert.equal(mtvRoomToJoinID, leavingUser.mtvRoom.uuid);

            /**
             * Same with creator
             */

            //CREATOR
            const creatorSocketForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_FORCED_DISCONNECTION',
                );
            const creatorSocketBForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    creatorSocketB,
                    'MTV_FORCED_DISCONNECTION',
                );

            //USER B

            //call userBSocketUserLengthUpdateSpy.once

            const userBSocketForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    userBSocket,
                    'MTV_FORCED_DISCONNECTION',
                );

            /**
             * Creator joins the room
             */
            creatorSocket.emit('MTV_JOIN_ROOM', { roomID: mtvRoomToJoinID });

            await waitFor(() => {
                //UserB
                assert.isTrue(userBSocketUserLengthUpdateSpy.calledOnce);
                assert.isTrue(userBSocketForcedDisconnectionSpy.calledOnce);

                //Creator
                assert.isTrue(creatorSocketForcedDisconnectionSpy.notCalled);
                assert.isTrue(creatorSocketBForcedDisconnectionSpy.notCalled);
            });

            connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(creatorSocket.id));
            assert.isFalse(connectedSocketsToRoom.has(creatorSocketB.id));

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

            (
                MtvServerToTemporalController.leaveWorkflow as MtvServerToTemporalControllerLeaveWorkflowStub
            ).restore();
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
                        .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                        .send(roomToLeaveState)
                        .expect(200);
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
                    await supertest(BASE_URL)
                        .post('/temporal/mtv/join')
                        .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                        .send({
                            state: roomToJoinState,
                            joiningUserID: relatedUserID,
                        })
                        .expect(200);
                    return;
                });

            /**
             * Mocking a mtvRoom in the databse
             */

            //CREATOR
            const creatorSocket = await createAuthenticatedUserAndGetSocket({
                userID: userAID,
                mtvRoomIDToAssociate,
            });
            const creatorToken = getSocketApiAuthToken(creatorSocket);
            const creatorSocketB = await createSocketConnection({
                userID: userAID,
                token: creatorToken,
            });

            //ROOM TO JOIN CREATOR
            await createAuthenticatedUserAndGetSocket({
                userID: roomToJoinCreatorID,
                mtvRoomIDToAssociate: mtvRoomToJoinID,
            });

            //USER B
            const userBSocket = await createAuthenticatedUserAndGetSocket({
                userID: userBID,
                mtvRoomIDToAssociate,
            });

            //USER C
            const userCSocket = await createAuthenticatedUserAndGetSocket({
                userID: userCID,
                mtvRoomIDToAssociate,
            });
            const userCToken = getSocketApiAuthToken(userCSocket);
            const userCSocketB = await createSocketConnection({
                userID: userCID,
                token: userCToken,
            });

            //CREATOR
            const creatorSocketUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_USER_LENGTH_UPDATE',
                );

            const creatorSocketBUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    creatorSocketB,
                    'MTV_USER_LENGTH_UPDATE',
                );

            //USER B
            const userBSocketUserLengthUpdateSpy = createSpyOnClientSocketEvent(
                userBSocket,
                'MTV_USER_LENGTH_UPDATE',
            );

            //USER C
            /**
             * This is the disconnecting one, in this way it should not receive
             * any event
             */

            const userCSocketUserLengthUpdateSpy = createSpyOnClientSocketEvent(
                userCSocket,
                'MTV_USER_LENGTH_UPDATE',
            );

            const userCSocketBUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    userCSocketB,
                    'MTV_USER_LENGTH_UPDATE',
                );

            /**
             * Emit join_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            await disconnectSocket(userCSocket);
            await disconnectSocket(userCSocketB);

            await waitFor(() => {
                //Creator
                assert.isTrue(creatorSocketUserLengthUpdateSpy.calledOnce);
                assert.isTrue(creatorSocketBUserLengthUpdateSpy.calledOnce);
                //UserB
                assert.isTrue(userBSocketUserLengthUpdateSpy.calledOnce);
                //UserC
                assert.isTrue(userCSocketUserLengthUpdateSpy.notCalled);
                assert.isTrue(userCSocketBUserLengthUpdateSpy.notCalled);
            });

            let connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(userCSocket.id));
            assert.isFalse(connectedSocketsToRoom.has(userCSocketB.id));

            const leavingUser = await User.findOrFail(userCID);
            await leavingUser.load('mtvRoom');

            assert.isNull(leavingUser.mtvRoom);

            /**
             * Same with creator
             */

            //CREATOR
            const creatorSocketForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_FORCED_DISCONNECTION',
                );
            const creatorSocketBForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_FORCED_DISCONNECTION',
                );

            //USER B
            //called userlength user b socket still called one time

            const userBSocketForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    userBSocket,
                    'MTV_FORCED_DISCONNECTION',
                );
            /**
             * Creator joins the room
             */
            await disconnectSocket(creatorSocket);
            await disconnectSocket(creatorSocketB);

            await waitFor(() => {
                //Creator
                assert.isTrue(creatorSocketBForcedDisconnectionSpy.notCalled);
                assert.isTrue(creatorSocketForcedDisconnectionSpy.notCalled);

                //UserB
                assert.isTrue(userBSocketUserLengthUpdateSpy.calledOnce);
                assert.isTrue(userBSocketForcedDisconnectionSpy.calledOnce);
            });

            connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(creatorSocket.id));
            assert.isFalse(connectedSocketsToRoom.has(creatorSocketB.id));

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

            //CREATOR
            const creatorSocket = await createAuthenticatedUserAndGetSocket({
                userID: userAID,
                mtvRoomIDToAssociate,
            });
            const creatorToken = getSocketApiAuthToken(creatorSocket);
            const creatorSocketB = await createSocketConnection({
                userID: userAID,
                token: creatorToken,
            });

            //USER B
            const userBSocket = await createAuthenticatedUserAndGetSocket({
                userID: userBID,
                mtvRoomIDToAssociate,
            });

            //USER C
            const userCSocket = await createAuthenticatedUserAndGetSocket({
                userID: userCID,
                mtvRoomIDToAssociate,
            });
            const userCToken = getSocketApiAuthToken(userCSocket);
            const userCSocketB = await createSocketConnection({
                userID: userCID,
                token: userCToken,
            });

            const { uuid: userCEmittingDevice } = await Device.findByOrFail(
                'socket_id',
                userCSocket.id,
            );

            (
                MtvServerToTemporalController.leaveWorkflow as MtvServerToTemporalControllerLeaveWorkflowStub
            ).restore();
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
                        .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                        .send(roomToLeaveState)
                        .expect(200);
                    return;
                });
            sinon.stub(
                MtvServerToTemporalController,
                'changeUserEmittingDevice',
            );
            sinon
                .stub(MtvServerToTemporalController, 'createMtvWorkflow')
                .callsFake(async ({ workflowID, userID, params }) => {
                    const state: MtvWorkflowStateWithUserRelatedInformation = {
                        roomID: workflowID,
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
                            emittingDeviceID: userCEmittingDevice,
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
                                    '/temporal/mtv/mtv-creation-acknowledgement',
                                )
                                .set(
                                    'Authorization',
                                    TEMPORAL_ADONIS_KEY_HEADER,
                                )
                                .send(state)
                                .expect(200),
                    );

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
            const creatorSocketUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_USER_LENGTH_UPDATE',
                );

            const creatorSocketBUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    creatorSocketB,
                    'MTV_USER_LENGTH_UPDATE',
                );

            //USER B
            const userBSocketUserLengthUpdateSpy = createSpyOnClientSocketEvent(
                userBSocket,
                'MTV_USER_LENGTH_UPDATE',
            );

            //USER C
            /**
             * This is the disconnecting one, in this way it should not receive
             * any event
             */

            const userCSocketUserLengthUpdateSpy = createSpyOnClientSocketEvent(
                userCSocket,
                'MTV_USER_LENGTH_UPDATE',
            );

            const userCSocketBUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    userCSocketB,
                    'MTV_USER_LENGTH_UPDATE',
                );

            const userCSocketMtvRoomSyncCallbackSpy =
                createSpyOnClientSocketEvent(
                    userCSocket,
                    'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
                );
            const userCSocketBMtvRoomSyncCallbackSpy =
                createSpyOnClientSocketEvent(
                    userCSocketB,
                    'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
                );

            /**
             * Emit join_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            const settings = getDefaultMtvRoomCreateRoomArgs();
            userCSocket.emit('MTV_CREATE_ROOM', settings);

            await waitFor(() => {
                //Creator
                assert.isTrue(creatorSocketUserLengthUpdateSpy.calledOnce);
                assert.isTrue(creatorSocketBUserLengthUpdateSpy.calledOnce);
                //UserB
                assert.isTrue(userBSocketUserLengthUpdateSpy.calledOnce);
                //UserC
                assert.isTrue(userCSocketUserLengthUpdateSpy.notCalled);
                assert.isTrue(userCSocketBUserLengthUpdateSpy.notCalled);
                assert.isTrue(userCSocketMtvRoomSyncCallbackSpy.calledOnce);
                assert.isTrue(userCSocketBMtvRoomSyncCallbackSpy.calledOnce);
            });

            let connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(userCSocket.id));
            assert.isFalse(connectedSocketsToRoom.has(userCSocketB.id));

            const leavingUser = await User.findOrFail(userCID);
            await leavingUser.load('mtvRoom');

            assert.isNotNull(leavingUser.mtvRoom);

            /**
             * Same with creator
             */

            //CREATOR
            const creatorSocketForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_FORCED_DISCONNECTION',
                );
            const creatorSocketBForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_FORCED_DISCONNECTION',
                );

            const creatorSocketMtvRoomSyncCallbackSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
                );
            const creatorSocketBMtvRoomSyncCallbackSpy =
                createSpyOnClientSocketEvent(
                    creatorSocketB,
                    'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
                );

            //USER B
            const userBSocketForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    userBSocket,
                    'MTV_FORCED_DISCONNECTION',
                );

            /**
             * Creator joins the room
             */
            const secondRoomSettings = getDefaultMtvRoomCreateRoomArgs();
            creatorSocket.emit('MTV_CREATE_ROOM', secondRoomSettings);

            await waitFor(() => {
                //Creator
                assert.isTrue(creatorSocketForcedDisconnectionSpy.notCalled);
                assert.isTrue(creatorSocketBForcedDisconnectionSpy.notCalled);
                assert.isTrue(creatorSocketMtvRoomSyncCallbackSpy.calledOnce);
                assert.isTrue(creatorSocketBMtvRoomSyncCallbackSpy.calledOnce);
                //UserB
                assert.isTrue(userBSocketUserLengthUpdateSpy.calledOnce);
                assert.isTrue(userBSocketForcedDisconnectionSpy.calledOnce);
            });

            await waitFor(async () => {
                connectedSocketsToRoom =
                    await SocketLifecycle.getConnectedSocketToRoom(
                        mtvRoomIDToAssociate,
                    );
                assert.isFalse(connectedSocketsToRoom.has(creatorSocket.id));
                assert.isFalse(connectedSocketsToRoom.has(creatorSocketB.id));
            });

            await waitFor(async () => {
                const leavingCreator = await User.findOrFail(userCID);
                await leavingCreator.load('mtvRoom');
                assert.isNotNull(leavingCreator.mtvRoom);

                assert.isNull(await MtvRoom.find(mtvRoomIDToAssociate));
            });
        });

        test(`It should make a user leave the room after he emits a MTV_LEAVE_ROOM client socket event dw 
        leaving user devices should not receive any leavedMtvRoom related socket event
        If the creator does the same it should send MTV_FORCED_DISCONNECTION to every remaining users in the room`, async (assert) => {
            const userAID = datatype.uuid();
            const userBID = datatype.uuid();
            const userCID = datatype.uuid();

            (
                MtvServerToTemporalController.leaveWorkflow as MtvServerToTemporalControllerLeaveWorkflowStub
            ).restore();
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
                        roomCreatorUserID: userAID,
                        roomID: workflowID,
                        tracks: null,
                        userRelatedInformation: null,
                        usersLength: 2,
                        minimumScoreToBePlayed: 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/mtv/user-length-update')
                        .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                        .send(state)
                        .expect(200);
                    return;
                });

            /**
             * Mocking a mtvRoom in the databse
             */
            const mtvRoomIDToAssociate = datatype.uuid();
            //CREATOR
            const creatorSocket = await createAuthenticatedUserAndGetSocket({
                userID: userAID,
                mtvRoomIDToAssociate,
            });
            const creatorToken = getSocketApiAuthToken(creatorSocket);
            const creatorSocketB = await createSocketConnection({
                userID: userAID,
                token: creatorToken,
            });

            //USER B
            const userBSocket = await createAuthenticatedUserAndGetSocket({
                userID: userBID,
                mtvRoomIDToAssociate,
            });

            //USER C
            const userCSocket = await createAuthenticatedUserAndGetSocket({
                userID: userCID,
                mtvRoomIDToAssociate,
            });
            const userCToken = getSocketApiAuthToken(userCSocket);
            const userCSocketB = await createSocketConnection({
                userID: userCID,
                token: userCToken,
            });

            //CREATOR
            const creatorSocketUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_USER_LENGTH_UPDATE',
                );

            const creatorSocketBUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    creatorSocketB,
                    'MTV_USER_LENGTH_UPDATE',
                );

            //USER B
            const userBSocketUserLengthUpdateSpy = createSpyOnClientSocketEvent(
                userBSocket,
                'MTV_USER_LENGTH_UPDATE',
            );

            // USER C
            const userCSocketLeaveRoomCallbackSpy =
                createSpyOnClientSocketEvent(
                    userCSocket,
                    'MTV_LEAVE_ROOM_CALLBACK',
                );
            const userCSocketBLeaveRoomCallbackSpy =
                createSpyOnClientSocketEvent(
                    userCSocketB,
                    'MTV_LEAVE_ROOM_CALLBACK',
                );
            const userCSocketUserLengthUpdateSpy = createSpyOnClientSocketEvent(
                userCSocket,
                'MTV_USER_LENGTH_UPDATE',
            );

            const userCSocketBUserLengthUpdateSpy =
                createSpyOnClientSocketEvent(
                    userCSocketB,
                    'MTV_USER_LENGTH_UPDATE',
                );

            /**
             * Emit leave_room with socket C
             * Expect B and socket to receive USER_LENGTH_UDPATE
             * server socket event
             */
            userCSocket.emit('MTV_LEAVE_ROOM');

            // Wait for user C's devices to have been told
            // to clear the room.
            await waitFor(() => {
                assert.equal(userCSocketLeaveRoomCallbackSpy.callCount, 1);
                assert.equal(userCSocketBLeaveRoomCallbackSpy.callCount, 1);
            });

            // Ensure user C's devices have been disconnected.
            let connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(userCSocket.id));
            assert.isFalse(connectedSocketsToRoom.has(userCSocketB.id));

            // Wait for remaining users to have been notified
            // about users list length update.
            await waitFor(() => {
                //Creator
                assert.isTrue(creatorSocketUserLengthUpdateSpy.calledOnce);
                assert.isTrue(creatorSocketBUserLengthUpdateSpy.calledOnce);
                //UserB
                assert.isTrue(userBSocketUserLengthUpdateSpy.calledOnce);
                //UserC
                assert.isTrue(userCSocketUserLengthUpdateSpy.notCalled);
                assert.isTrue(userCSocketBUserLengthUpdateSpy.notCalled);
            });

            const leavingUser = await User.findOrFail(userCID);
            await leavingUser.load('mtvRoom');

            assert.isNull(leavingUser.mtvRoom);

            /**
             * Now same with the creator
             * We expect remaining user to receive a MTV_FORCED_DISCONNECTION event
             */

            //CREATOR
            const creatorSocketForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_FORCED_DISCONNECTION',
                );
            const creatorSocketBForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    creatorSocket,
                    'MTV_FORCED_DISCONNECTION',
                );

            //USER B
            const userBSocketForcedDisconnectionSpy =
                createSpyOnClientSocketEvent(
                    userBSocket,
                    'MTV_FORCED_DISCONNECTION',
                );

            /**
             * Creator leaves the room
             */
            creatorSocket.emit('MTV_LEAVE_ROOM');

            await waitFor(() => {
                //Creator
                assert.isTrue(creatorSocketForcedDisconnectionSpy.notCalled);
                assert.isTrue(creatorSocketBForcedDisconnectionSpy.notCalled);
                //UserB
                assert.isTrue(userBSocketUserLengthUpdateSpy.calledOnce);
                assert.isTrue(userBSocketForcedDisconnectionSpy.calledOnce);
            });

            connectedSocketsToRoom =
                await SocketLifecycle.getConnectedSocketToRoom(
                    mtvRoomIDToAssociate,
                );
            assert.isFalse(connectedSocketsToRoom.has(creatorSocket.id));
            assert.isFalse(connectedSocketsToRoom.has(creatorSocketB.id));

            const leavingCreator = await User.findOrFail(userCID);
            await leavingCreator.load('mtvRoom');

            assert.isNull(leavingCreator.mtvRoom);
            assert.isNull(await MtvRoom.find(mtvRoomIDToAssociate));
        });
    },
);
