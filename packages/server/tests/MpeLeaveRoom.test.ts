import Database from '@ioc:Adonis/Lucid/Database';
import { MpeAcknowledgeLeaveRequestBody } from '@musicroom/types';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import {
    initTestUtils,
    generateMpeWorkflowState,
    createSpyOnClientSocketEvent,
    BASE_URL,
    TEST_MPE_TEMPORAL_LISTENER,
    getSocketApiAuthToken,
    TEMPORAL_ADONIS_KEY_HEADER,
} from './utils/TestUtils';

test.group('MPE leave room tests group', (group) => {
    const {
        createAuthenticatedUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        waitFor,
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

    test('It should leave the room for a basic user', async (assert) => {
        const creatorUserID = datatype.uuid();
        const joiningUserID = datatype.uuid();
        const mpeRoomToAssociate = {
            roomID: datatype.uuid(),
            roomName: random.words(3),
        };
        const roomID = mpeRoomToAssociate.roomID;
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [mpeRoomToAssociate],
        });
        const creatorToken = getSocketApiAuthToken(creatorSocket);
        const creatorSocketB = await createSocketConnection({
            userID: creatorUserID,
            token: creatorToken,
        });

        const joiningUserSocket = await createAuthenticatedUserAndGetSocket({
            userID: joiningUserID,
            mpeRoomIDToAssociate: [mpeRoomToAssociate],
        });
        const joiningUserToken = getSocketApiAuthToken(joiningUserSocket);
        const joiningUserSocketB = await createSocketConnection({
            userID: joiningUserID,
            token: joiningUserToken,
        });

        const state = generateMpeWorkflowState({
            roomID,
            roomCreatorUserID: creatorUserID,
        });

        sinon
            .stub(MpeServerToTemporalController, 'leaveWorkflow')
            .callsFake(async ({ workflowID }) => {
                assert.equal(roomID, workflowID);

                const body: MpeAcknowledgeLeaveRequestBody = {
                    leavingUserID: joiningUserID,
                    state,
                };
                setImmediate(() => {
                    setImmediate(async () => {
                        await supertest(BASE_URL)
                            .post(
                                urlcat(
                                    TEST_MPE_TEMPORAL_LISTENER,
                                    'acknowledge-leave',
                                ),
                            )
                            .set('Authorization', TEMPORAL_ADONIS_KEY_HEADER)
                            .send(body)
                            .expect(200);
                    });
                });

                return {
                    ok: 1,
                };
            });

        //Creator
        const creatorSocketMpeLeaveRoomCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_LEAVE_ROOM_CALLBACK',
            );

        const creatorSocketMpeUsersLengthUpdateCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_USERS_LENGTH_UPDATE',
            );

        const creatorSocketMpeForcedDisconnectionSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_FORCED_DISCONNECTION',
            );

        const creatorSocketBMpeLeaveRoomCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_LEAVE_ROOM_CALLBACK',
            );

        const creatorSocketBMpeUsersLengthUpdateCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_USERS_LENGTH_UPDATE',
            );

        const creatorSocketBMpeForcedDisconnectionSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_FORCED_DISCONNECTION',
            );

        // Joining user
        const joiningUserSocketMpeLeaveRoomCallbackSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocket,
                'MPE_LEAVE_ROOM_CALLBACK',
            );

        const joiningUserSocketMpeUsersLengthUpdateCallbackSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocket,
                'MPE_USERS_LENGTH_UPDATE',
            );

        const joiningUserSocketMpeForcedDisconnectionSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocket,
                'MPE_FORCED_DISCONNECTION',
            );

        const joiningUserSocketBMpeLeaveRoomCallbackSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocketB,
                'MPE_LEAVE_ROOM_CALLBACK',
            );

        const joiningUserSocketBMpeUsersLengthUpdateCallbackSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocketB,
                'MPE_USERS_LENGTH_UPDATE',
            );

        const joiningUserSocketBMpeForcedDisconnectionSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocketB,
                'MPE_FORCED_DISCONNECTION',
            );

        joiningUserSocket.emit('MPE_LEAVE_ROOM', {
            roomID,
        });

        await waitFor(async () => {
            //Creator
            assert.isTrue(creatorSocketMpeLeaveRoomCallbackSpy.notCalled);
            assert.isTrue(
                creatorSocketMpeUsersLengthUpdateCallbackSpy.calledOnce,
            );
            assert.isTrue(creatorSocketMpeForcedDisconnectionSpy.notCalled);
            assert.isTrue(creatorSocketBMpeLeaveRoomCallbackSpy.notCalled);
            assert.isTrue(
                creatorSocketBMpeUsersLengthUpdateCallbackSpy.calledOnce,
            );
            assert.isTrue(creatorSocketBMpeForcedDisconnectionSpy.notCalled);

            //Joining user
            assert.isTrue(joiningUserSocketMpeLeaveRoomCallbackSpy.calledOnce);
            assert.isTrue(
                joiningUserSocketMpeUsersLengthUpdateCallbackSpy.notCalled,
            );
            assert.isTrue(joiningUserSocketMpeForcedDisconnectionSpy.notCalled);
            assert.isTrue(joiningUserSocketBMpeLeaveRoomCallbackSpy.calledOnce);
            assert.isTrue(
                joiningUserSocketBMpeUsersLengthUpdateCallbackSpy.notCalled,
            );
            assert.isTrue(
                joiningUserSocketBMpeForcedDisconnectionSpy.notCalled,
            );

            const connectedSocket =
                await SocketLifecycle.getConnectedSocketToRoom(roomID);
            assert.isTrue(connectedSocket.has(creatorSocket.id));
            assert.isTrue(connectedSocket.has(creatorSocketB.id));

            assert.isFalse(connectedSocket.has(joiningUserSocket.id));
            assert.isFalse(connectedSocket.has(joiningUserSocketB.id));
        });
    });

    test('Creator should leave his mpe room', async (assert) => {
        const creatorUserID = datatype.uuid();
        const joiningUserID = datatype.uuid();
        const mpeRoomToAssociate = {
            roomID: datatype.uuid(),
            roomName: random.words(3),
        };
        const roomID = mpeRoomToAssociate.roomID;
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [mpeRoomToAssociate],
        });
        const creatorToken = getSocketApiAuthToken(creatorSocket);
        const creatorSocketB = await createSocketConnection({
            userID: creatorUserID,
            token: creatorToken,
        });

        const joiningUserSocket = await createAuthenticatedUserAndGetSocket({
            userID: joiningUserID,
            mpeRoomIDToAssociate: [mpeRoomToAssociate],
        });
        const joiningUserToken = getSocketApiAuthToken(joiningUserSocket);
        const joiningUserSocketB = await createSocketConnection({
            userID: joiningUserID,
            token: joiningUserToken,
        });

        sinon
            .stub(MpeServerToTemporalController, 'terminateWorkflow')
            .callsFake(async ({ workflowID }) => {
                assert.equal(roomID, workflowID);

                return {
                    ok: 1,
                };
            });

        //Creator
        const creatorSocketMpeLeaveRoomCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_LEAVE_ROOM_CALLBACK',
            );

        const creatorSocketMpeUsersLengthUpdateCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_USERS_LENGTH_UPDATE',
            );

        const creatorSocketMpeForcedDisconnectionSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_FORCED_DISCONNECTION',
            );

        const creatorSocketBMpeLeaveRoomCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_LEAVE_ROOM_CALLBACK',
            );

        const creatorSocketBMpeUsersLengthUpdateCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_USERS_LENGTH_UPDATE',
            );

        const creatorSocketBMpeForcedDisconnectionSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_FORCED_DISCONNECTION',
            );

        // Joining user
        const joiningUserSocketMpeLeaveRoomCallbackSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocket,
                'MPE_LEAVE_ROOM_CALLBACK',
            );

        const joiningUserSocketMpeUsersLengthUpdateCallbackSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocket,
                'MPE_USERS_LENGTH_UPDATE',
            );

        const joiningUserSocketMpeForcedDisconnectionSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocket,
                'MPE_FORCED_DISCONNECTION',
            );

        const joiningUserSocketBMpeLeaveRoomCallbackSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocketB,
                'MPE_LEAVE_ROOM_CALLBACK',
            );

        const joiningUserSocketBMpeUsersLengthUpdateCallbackSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocketB,
                'MPE_USERS_LENGTH_UPDATE',
            );

        const joiningUserSocketBMpeForcedDisconnectionSpy =
            createSpyOnClientSocketEvent(
                joiningUserSocketB,
                'MPE_FORCED_DISCONNECTION',
            );

        creatorSocket.emit('MPE_LEAVE_ROOM', {
            roomID,
        });

        await waitFor(async () => {
            //Creator
            assert.isTrue(creatorSocketMpeLeaveRoomCallbackSpy.calledOnce);
            assert.isTrue(
                creatorSocketMpeUsersLengthUpdateCallbackSpy.notCalled,
            );
            assert.isTrue(creatorSocketMpeForcedDisconnectionSpy.notCalled);
            assert.isTrue(creatorSocketBMpeLeaveRoomCallbackSpy.calledOnce);
            assert.isTrue(
                creatorSocketBMpeUsersLengthUpdateCallbackSpy.notCalled,
            );
            assert.isTrue(creatorSocketBMpeForcedDisconnectionSpy.notCalled);

            //Joining user
            assert.isTrue(joiningUserSocketMpeLeaveRoomCallbackSpy.notCalled);
            assert.isTrue(
                joiningUserSocketMpeUsersLengthUpdateCallbackSpy.notCalled,
            );
            assert.isTrue(
                joiningUserSocketMpeForcedDisconnectionSpy.calledOnce,
            );
            assert.isTrue(joiningUserSocketBMpeLeaveRoomCallbackSpy.notCalled);
            assert.isTrue(
                joiningUserSocketBMpeUsersLengthUpdateCallbackSpy.notCalled,
            );
            assert.isTrue(
                joiningUserSocketBMpeForcedDisconnectionSpy.calledOnce,
            );

            const connectedSocket =
                await SocketLifecycle.getConnectedSocketToRoom(roomID);
            assert.isFalse(connectedSocket.has(creatorSocket.id));
            assert.isFalse(connectedSocket.has(creatorSocketB.id));

            assert.isFalse(connectedSocket.has(joiningUserSocket.id));
            assert.isFalse(connectedSocket.has(joiningUserSocketB.id));
        });
    });
});
