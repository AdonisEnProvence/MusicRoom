import Database from '@ioc:Adonis/Lucid/Database';
import {
    MpeAcknowledgeChangeTrackOrderRequestBody,
    MpeChangeTrackOrderOperationToApply,
} from '@musicroom/types';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import { MPE_TEMPORAL_LISTENER } from '../start/routes';
import {
    BASE_URL,
    createSpyOnClientSocketEvent,
    generateMpeWorkflowState,
    initTestUtils,
} from './utils/TestUtils';

test.group(`mpe rooms change track order group test`, (group) => {
    const {
        createUserAndGetSocket,
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

    test('It should handle and spread back to every user  change track order DOWN client socket event ', async (assert) => {
        const creatorUserID = datatype.uuid();
        const joinerUserID = datatype.uuid();
        const mpeRoomIDToAssociate = datatype.uuid();
        const state = generateMpeWorkflowState({
            roomID: mpeRoomIDToAssociate,
            roomCreatorUserID: creatorUserID,
        });

        //Creator
        const creatorSocket = await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [{ roomID: mpeRoomIDToAssociate }],
        });
        const creatorSocketB = await createSocketConnection({
            userID: creatorUserID,
        });
        ///

        //Joiner
        const joinerSocket = await createUserAndGetSocket({
            userID: joinerUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID: mpeRoomIDToAssociate,
                },
            ],
        });

        const joinerSocketB = await createSocketConnection({
            userID: joinerUserID,
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

        //Joiner Device B
        const joinerSocket1TracksListUpdateSpy = createSpyOnClientSocketEvent(
            joinerSocketB,
            'MPE_TRACKS_LIST_UPDATE',
        );
        const joinerSocket1MpeChangeTrackOrderSucessCallbackSpy =
            createSpyOnClientSocketEvent(
                joinerSocketB,
                'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
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
                            MPE_TEMPORAL_LISTENER,
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

            //Others should only receive the global tracks list udpate
            assert.isTrue(creatorSocketBTracksListUpdateSpy.calledOnce);
            assert.isTrue(
                creatorSocketBMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(joinerSocketTracksListUpdateSpy.calledOnce);
            assert.isTrue(
                joinerSocketMpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
            assert.isTrue(joinerSocket1TracksListUpdateSpy.calledOnce);
            assert.isTrue(
                joinerSocket1MpeChangeTrackOrderSucessCallbackSpy.notCalled,
            );
        });
    });

    test('It should prefix the OperationToApply to Up ', async (assert) => {
        const creatorUserID = datatype.uuid();
        const mpeRoomIDToAssociate = datatype.uuid();

        //Creator
        const creatorSocket = await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [{ roomID: mpeRoomIDToAssociate }],
        });

        let mockHasBeenCalled = false;
        sinon
            .stub(MpeServerToTemporalController, 'changeTrackOrder')
            .callsFake(async ({ operationToApply }) => {
                //Checking that adonis will prefix MpeChangeTrackOrderOperationToApply.Values.UP
                //on MPE_CHANGE_TRACK_ORDER_UP client socket event
                assert.equal(
                    operationToApply,
                    MpeChangeTrackOrderOperationToApply.Values.UP,
                );

                mockHasBeenCalled = true;
                return {
                    ok: 1,
                };
            });

        creatorSocket.emit('MPE_CHANGE_TRACK_ORDER_UP', {
            fromIndex: 0,
            roomID: mpeRoomIDToAssociate,
            trackID: datatype.uuid(),
        });

        await waitFor(() => {
            assert.isTrue(mockHasBeenCalled);
        });
    });
});
