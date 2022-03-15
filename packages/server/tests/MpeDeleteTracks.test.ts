import Database from '@ioc:Adonis/Lucid/Database';
import { MpeAcknowledgeDeletingTracksRequestBody } from '@musicroom/types';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    initTestUtils,
    generateMpeWorkflowState,
    createSpyOnClientSocketEvent,
    TEST_MPE_TEMPORAL_LISTENER,
    getSocketApiAuthToken,
} from './utils/TestUtils';

test.group('MPE Delete Tracks', (group) => {
    const {
        createAuthenticatedUserAndGetSocket,
        createSocketConnection,
        disconnectEveryRemainingSocketConnection,
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

    test('Sends acknowledgement to the user if deleting tracks succeeded', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const userASocket1 = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });
        const roomState = generateMpeWorkflowState({
            roomID,
            roomCreatorUserID: creatorUserID,
        });

        sinon
            .stub(MpeServerToTemporalController, 'deleteTracks')
            .callsFake(async ({ deviceID, userID }) => {
                const body: MpeAcknowledgeDeletingTracksRequestBody = {
                    deviceID,
                    userID,
                    state: {
                        ...roomState,
                        tracks: [],
                    },
                };

                await supertest(BASE_URL)
                    .post(
                        urlcat(
                            TEST_MPE_TEMPORAL_LISTENER,
                            'acknowledge-deleting-tracks',
                        ),
                    )
                    .send(body)
                    .expect(200);

                return Promise.resolve({
                    ok: 1,
                });
            });

        const userASocket1DeleteTracksSuccessCallbackSpy =
            createSpyOnClientSocketEvent(
                userASocket1,
                'MPE_DELETE_TRACKS_SUCCESS_CALLBACK',
            );
        const userASocket1TracksListUpdateSpy = createSpyOnClientSocketEvent(
            userASocket1,
            'MPE_TRACKS_LIST_UPDATE',
        );

        const tracksToDelete = roomState.tracks.map((track) => track.id);
        userASocket1.emit('MPE_DELETE_TRACKS', {
            roomID,
            tracksIDs: tracksToDelete,
        });

        await waitFor(() => {
            assert.isTrue(
                userASocket1DeleteTracksSuccessCallbackSpy.calledOnceWithExactly(
                    {
                        roomID,
                        state: {
                            ...roomState,
                            tracks: [],
                        },
                    },
                ),
            );
        });

        assert.isTrue(userASocket1TracksListUpdateSpy.notCalled);
    });

    test("Sends updated tracks list to other user's devices if deleting tracks succeeded", async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const userASocket1 = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });
        const userAToken = getSocketApiAuthToken(userASocket1);
        const userASocket2 = await createSocketConnection({
            userID: creatorUserID,
            token: userAToken,
        });
        const roomState = generateMpeWorkflowState({
            roomID,
            roomCreatorUserID: creatorUserID,
        });

        sinon
            .stub(MpeServerToTemporalController, 'deleteTracks')
            .callsFake(async ({ deviceID, userID }) => {
                const body: MpeAcknowledgeDeletingTracksRequestBody = {
                    deviceID,
                    userID,
                    state: {
                        ...roomState,
                        tracks: [],
                    },
                };

                await supertest(BASE_URL)
                    .post(
                        urlcat(
                            TEST_MPE_TEMPORAL_LISTENER,
                            'acknowledge-deleting-tracks',
                        ),
                    )
                    .send(body)
                    .expect(200);

                return Promise.resolve({
                    ok: 1,
                });
            });

        const userASocket2TracksListUpdateSpy = createSpyOnClientSocketEvent(
            userASocket2,
            'MPE_TRACKS_LIST_UPDATE',
        );

        const tracksToDelete = roomState.tracks.map((track) => track.id);
        userASocket1.emit('MPE_DELETE_TRACKS', {
            roomID,
            tracksIDs: tracksToDelete,
        });

        await waitFor(() => {
            assert.isTrue(
                userASocket2TracksListUpdateSpy.calledOnceWithExactly({
                    roomID,
                    state: {
                        ...roomState,
                        tracks: [],
                    },
                }),
            );
        });
    });

    test('Sends updated tracks list to all other users if deleting tracks succeeded', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const userASocket1 = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });
        const userBSocket1 = await createAuthenticatedUserAndGetSocket({
            userID: datatype.uuid(),
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });
        const roomState = generateMpeWorkflowState({
            roomID,
            roomCreatorUserID: creatorUserID,
        });

        sinon
            .stub(MpeServerToTemporalController, 'deleteTracks')
            .callsFake(async ({ deviceID, userID }) => {
                const body: MpeAcknowledgeDeletingTracksRequestBody = {
                    deviceID,
                    userID,
                    state: {
                        ...roomState,
                        tracks: [],
                    },
                };

                await supertest(BASE_URL)
                    .post(
                        urlcat(
                            TEST_MPE_TEMPORAL_LISTENER,
                            'acknowledge-deleting-tracks',
                        ),
                    )
                    .send(body)
                    .expect(200);

                return Promise.resolve({
                    ok: 1,
                });
            });

        const userBSocket1TracksListUpdateSpy = createSpyOnClientSocketEvent(
            userBSocket1,
            'MPE_TRACKS_LIST_UPDATE',
        );

        const tracksToDelete = roomState.tracks.map((track) => track.id);
        userASocket1.emit('MPE_DELETE_TRACKS', {
            roomID,
            tracksIDs: tracksToDelete,
        });

        await waitFor(() => {
            assert.isTrue(
                userBSocket1TracksListUpdateSpy.calledOnceWithExactly({
                    roomID,
                    state: {
                        ...roomState,
                        tracks: [],
                    },
                }),
            );
        });
    });
});
