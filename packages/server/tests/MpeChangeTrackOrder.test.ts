import Database from '@ioc:Adonis/Lucid/Database';
import {
    MpeAcknowledgeChangeTrackOrderRequestBody,
    MpeChangeTrackOrderOperationToApply,
    MpeRejectChangeTrackOrderRequestBody,
} from '@musicroom/types';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    createSpyOnClientSocketEvent,
    generateMpeWorkflowState,
    getSocketApiAuthToken,
    initTestUtils,
    TEST_MPE_TEMPORAL_LISTENER,
} from './utils/TestUtils';

test.group(`mpe rooms change track order group test`, (group) => {
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

    test('It should handle and spread back success to every user in mpe room after a change track order DOWN client socket event', async (assert) => {
        const creatorUserID = datatype.uuid();
        const joinerUserID = datatype.uuid();
        const mpeRoomIDToAssociate = datatype.uuid();
        const state = generateMpeWorkflowState({
            roomID: mpeRoomIDToAssociate,
            roomCreatorUserID: creatorUserID,
        });

        //Creator
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [{ roomID: mpeRoomIDToAssociate }],
        });
        const creatorToken = getSocketApiAuthToken(creatorSocket);
        const creatorSocketB = await createSocketConnection({
            userID: creatorUserID,
            token: creatorToken,
        });
        ///

        //Joiner
        const joinerSocket = await createAuthenticatedUserAndGetSocket({
            userID: joinerUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID: mpeRoomIDToAssociate,
                },
            ],
        });
        const joinerToken = getSocketApiAuthToken(joinerSocket);
        const joinerSocketB = await createSocketConnection({
            userID: joinerUserID,
            token: joinerToken,
        });

        //Creator
        const creatorSocketTracksListUpdateSpy = createSpyOnClientSocketEvent(
            creatorSocket,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const creatorSocketMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const creatorSocketMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        //Creator Device B
        const creatorSocketBTracksListUpdateSpy = createSpyOnClientSocketEvent(
            creatorSocketB,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const creatorSocketBMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const creatorSocketBMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        //Joiner
        const joinerSocketTracksListUpdateSpy = createSpyOnClientSocketEvent(
            joinerSocket,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const joinerSocketMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                joinerSocket,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const joinerSocketMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                joinerSocket,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        //Joiner Device B
        const joinerSocketBTracksListUpdateSpy = createSpyOnClientSocketEvent(
            joinerSocketB,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const joinerSocketBMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                joinerSocketB,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const joinerSocketBMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                joinerSocketB,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        ///

        sinon
            .stub(MpeServerToTemporalController, 'changeTrackOrder')
            .callsFake(async ({ deviceID, userID, operationToApply }) => {
                const response: MpeAcknowledgeChangeTrackOrderRequestBody = {
                    deviceID,
                    userID,
                    state,
                };

                //Checking that adonis will prefix MpeChangeTrackOrderOperationToApply.Values.DOWN
                //on MPE_CHANGE_TRACK_ORDER_DOWN client socket event
                assert.equal(
                    operationToApply,
                    MpeChangeTrackOrderOperationToApply.Values.DOWN,
                );

                await supertest(BASE_URL)
                    .post(
                        urlcat(
                            TEST_MPE_TEMPORAL_LISTENER,
                            'acknowledge-change-track-order',
                        ),
                    )
                    .send(response)
                    .expect(200);

                return {
                    ok: 1,
                };
            });

        creatorSocket.emit('MPE_CHANGE_TRACK_ORDER_DOWN', {
            fromIndex: 0,
            roomID: mpeRoomIDToAssociate,
            trackID: datatype.uuid(),
        });

        await waitFor(() => {
            //Creator device who emit the operation should no receive the global tracks list update
            //But should receive the specific callback
            assert.isTrue(creatorSocketTracksListUpdateSpy.notCalled);
            assert.isTrue(
                creatorSocketMpeChangeTrackOrderSucessCallbackSpy.calledOnce,
            );
            assert.isTrue(
                creatorSocketMpeChangeTrackOrderFailCallbackSpy.notCalled,
            );

            //Others should only receive the global tracks list udpate
            assert.isTrue(creatorSocketBTracksListUpdateSpy.calledOnce);
            assert.isTrue(
                creatorSocketBMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(
                creatorSocketBMpeChangeTrackOrderFailCallbackSpy.notCalled,
            );

            assert.isTrue(joinerSocketTracksListUpdateSpy.calledOnce);
            assert.isTrue(
                joinerSocketMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(
                joinerSocketMpeChangeTrackOrderFailCallbackSpy.notCalled,
            );

            assert.isTrue(joinerSocketBTracksListUpdateSpy.calledOnce);
            assert.isTrue(
                joinerSocketBMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(
                joinerSocketBMpeChangeTrackOrderFailCallbackSpy.notCalled,
            );
        });
    });

    test('It should handle and spread back failure to user operation emitter device after a change track order DOWN client socket event', async (assert) => {
        const creatorUserID = datatype.uuid();
        const joinerUserID = datatype.uuid();
        const mpeRoomIDToAssociate = datatype.uuid();

        //Creator
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [{ roomID: mpeRoomIDToAssociate }],
        });
        const creatorToken = getSocketApiAuthToken(creatorSocket);
        const creatorSocketB = await createSocketConnection({
            userID: creatorUserID,
            token: creatorToken,
        });
        ///

        //Joiner
        const joinerSocket = await createAuthenticatedUserAndGetSocket({
            userID: joinerUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID: mpeRoomIDToAssociate,
                },
            ],
        });
        const joinerToken = getSocketApiAuthToken(joinerSocket);
        const joinerSocketB = await createSocketConnection({
            userID: joinerUserID,
            token: joinerToken,
        });

        //Creator
        const creatorSocketTracksListUpdateSpy = createSpyOnClientSocketEvent(
            creatorSocket,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const creatorSocketMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const creatorSocketMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        //Creator Device B
        const creatorSocketBTracksListUpdateSpy = createSpyOnClientSocketEvent(
            creatorSocketB,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const creatorSocketBMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const creatorSocketBMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        //Joiner
        const joinerSocketTracksListUpdateSpy = createSpyOnClientSocketEvent(
            joinerSocket,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const joinerSocketMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                joinerSocket,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const joinerSocketMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                joinerSocket,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        //Joiner Device B
        const joinerSocketBTracksListUpdateSpy = createSpyOnClientSocketEvent(
            joinerSocketB,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const joinerSocketBMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                joinerSocketB,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const joinerSocketBMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                joinerSocketB,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        ///

        sinon
            .stub(MpeServerToTemporalController, 'changeTrackOrder')
            .callsFake(
                async ({ deviceID, userID, operationToApply, workflowID }) => {
                    const response: MpeRejectChangeTrackOrderRequestBody = {
                        deviceID,
                        userID,
                        roomID: workflowID,
                    };

                    //Checking that adonis will prefix MpeChangeTrackOrderOperationToApply.Values.UP
                    //on MPE_CHANGE_TRACK_ORDER_UP client socket event
                    assert.equal(
                        operationToApply,
                        MpeChangeTrackOrderOperationToApply.Values.UP,
                    );

                    await supertest(BASE_URL)
                        .post(
                            urlcat(
                                TEST_MPE_TEMPORAL_LISTENER,
                                'reject-change-track-order',
                            ),
                        )
                        .send(response)
                        .expect(200);

                    return {
                        ok: 1,
                    };
                },
            );

        creatorSocket.emit('MPE_CHANGE_TRACK_ORDER_UP', {
            fromIndex: 0,
            roomID: mpeRoomIDToAssociate,
            trackID: datatype.uuid(),
        });

        await waitFor(() => {
            //Creator device who emit the operation should no receive the global tracks list update
            //But should receive the specific callback
            assert.isTrue(creatorSocketTracksListUpdateSpy.notCalled);
            assert.isTrue(
                creatorSocketMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(
                creatorSocketMpeChangeTrackOrderFailCallbackSpy.calledOnce,
            );

            //Others should only receive the global tracks list udpate
            assert.isTrue(creatorSocketBTracksListUpdateSpy.notCalled);
            assert.isTrue(
                creatorSocketBMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(
                creatorSocketBMpeChangeTrackOrderFailCallbackSpy.notCalled,
            );

            assert.isTrue(joinerSocketTracksListUpdateSpy.notCalled);
            assert.isTrue(
                joinerSocketMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(
                joinerSocketMpeChangeTrackOrderFailCallbackSpy.notCalled,
            );

            assert.isTrue(joinerSocketBTracksListUpdateSpy.notCalled);
            assert.isTrue(
                joinerSocketBMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(
                joinerSocketBMpeChangeTrackOrderFailCallbackSpy.notCalled,
            );
        });
    });

    test('It should cancel operation change track order if fromIndex params is negative ', async (assert) => {
        const creatorUserID = datatype.uuid();
        const mpeRoomIDToAssociate = datatype.uuid();

        //Creator
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [{ roomID: mpeRoomIDToAssociate }],
        });

        //Creator
        const creatorSocketTracksListUpdateSpy = createSpyOnClientSocketEvent(
            creatorSocket,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const creatorSocketMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const creatorSocketMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        sinon
            .stub(MpeServerToTemporalController, 'changeTrackOrder')
            .callsFake(async () => {
                assert.isTrue(false);
                return {
                    ok: 1,
                };
            });

        creatorSocket.emit('MPE_CHANGE_TRACK_ORDER_UP', {
            fromIndex: -1,
            roomID: mpeRoomIDToAssociate,
            trackID: datatype.uuid(),
        });

        await waitFor(() => {
            assert.isTrue(creatorSocketTracksListUpdateSpy.notCalled);
            assert.isTrue(
                creatorSocketMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(
                creatorSocketMpeChangeTrackOrderFailCallbackSpy.notCalled,
            );
        });
    });

    test('It should reject change track order as user is not given roomID member', async (assert) => {
        const creatorUserID = datatype.uuid();
        const mpeRoomIDToAssociate = datatype.uuid();

        //Creator
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [{ roomID: mpeRoomIDToAssociate }],
        });

        //Creator
        const creatorSocketTracksListUpdateSpy = createSpyOnClientSocketEvent(
            creatorSocket,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const creatorSocketMpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
            );
        const creatorSocketMpeChangeTrackOrderFailCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
            );

        sinon
            .stub(MpeServerToTemporalController, 'changeTrackOrder')
            .callsFake(async () => {
                assert.isTrue(false);
                return {
                    ok: 1,
                };
            });

        creatorSocket.emit('MPE_CHANGE_TRACK_ORDER_UP', {
            fromIndex: 0,
            roomID: datatype.uuid(),
            trackID: datatype.uuid(),
        });

        await waitFor(() => {
            assert.isTrue(creatorSocketTracksListUpdateSpy.notCalled);
            assert.isTrue(
                creatorSocketMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(
                creatorSocketMpeChangeTrackOrderFailCallbackSpy.calledOnce,
            );
        });
    });
});
