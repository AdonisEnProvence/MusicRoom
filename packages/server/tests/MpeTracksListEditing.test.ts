import Database from '@ioc:Adonis/Lucid/Database';
import {
    AllServerToClientEvents,
    MpeAcknowledgeAddingTracksRequestBody,
    MpeRejectAddingTracksRequestBody,
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
    initTestUtils,
    generateMpeWorkflowState,
} from './utils/TestUtils';

function noop() {
    return undefined;
}

test.group('MPE Rooms Tracks List Editing', (group) => {
    const {
        createUserAndGetSocket,
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

    test('Can not add tracks for a room in which user is not member', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const socket = await createUserAndGetSocket({
            userID: creatorUserID,
            // User is not in any room.
            mpeRoomIDToAssociate: [],
        });

        const addTracksSpy = sinon.stub(
            MpeServerToTemporalController,
            'addTracks',
        );

        const socketAddTracksFailCallbackSpy =
            sinon.spy<AllServerToClientEvents['MPE_ADD_TRACKS_FAIL_CALLBACK']>(
                noop,
            );
        socket.on(
            'MPE_ADD_TRACKS_FAIL_CALLBACK',
            socketAddTracksFailCallbackSpy,
        );

        socket.emit('MPE_ADD_TRACKS', {
            roomID,
            tracksIDs: [datatype.uuid()],
        });

        await waitFor(async () => {
            assert.isTrue(
                socketAddTracksFailCallbackSpy.calledOnceWithExactly({
                    roomID,
                }),
            );
        });

        assert.isFalse(addTracksSpy.called);
    });

    test('Sends rejection message to user if tracks could not be added by Temporal', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const socket = await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });

        const addTracksSpy = sinon
            .stub(MpeServerToTemporalController, 'addTracks')
            .callsFake(async ({ deviceID }) => {
                setTimeout(async function simulateFail() {
                    const body: MpeRejectAddingTracksRequestBody = {
                        userID: creatorUserID,
                        deviceID,
                        roomID,
                    };

                    await supertest(BASE_URL)
                        .post(
                            urlcat(
                                MPE_TEMPORAL_LISTENER,
                                'reject-adding-tracks',
                            ),
                        )
                        .send(body)
                        .expect(200);
                }, 10);

                return Promise.resolve({
                    ok: 1,
                });
            });

        const socketAddTracksFailCallbackSpy =
            sinon.spy<AllServerToClientEvents['MPE_ADD_TRACKS_FAIL_CALLBACK']>(
                noop,
            );
        socket.on(
            'MPE_ADD_TRACKS_FAIL_CALLBACK',
            socketAddTracksFailCallbackSpy,
        );

        const tracksToAdd = [datatype.uuid()];
        socket.emit('MPE_ADD_TRACKS', {
            roomID,
            tracksIDs: tracksToAdd,
        });

        await waitFor(() => {
            assert.isTrue(
                addTracksSpy.calledOnceWithExactly({
                    deviceID: sinon.match.string,
                    userID: creatorUserID,
                    tracksIDs: tracksToAdd,
                    workflowID: roomID,
                }),
            );
        });

        await waitFor(() => {
            assert.isTrue(
                socketAddTracksFailCallbackSpy.calledOnceWithExactly({
                    roomID,
                }),
            );
        });
    });

    test('Sends adding tracks acknowledgement to the user if it succeeded', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const userASocket1 = await createUserAndGetSocket({
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
            .stub(MpeServerToTemporalController, 'addTracks')
            .callsFake(async ({ deviceID }) => {
                setTimeout(async function simulateFail() {
                    const body: MpeAcknowledgeAddingTracksRequestBody = {
                        userID: creatorUserID,
                        deviceID,
                        state: roomState,
                    };

                    await supertest(BASE_URL)
                        .post(
                            urlcat(
                                MPE_TEMPORAL_LISTENER,
                                'acknowledge-adding-tracks',
                            ),
                        )
                        .send(body)
                        .expect(200);
                }, 10);

                return Promise.resolve({
                    ok: 1,
                });
            });

        const userASocket1AddTracksSuccessCallbackSpy =
            sinon.spy<
                AllServerToClientEvents['MPE_ADD_TRACKS_SUCCESS_CALLBACK']
            >(noop);
        userASocket1.on(
            'MPE_ADD_TRACKS_SUCCESS_CALLBACK',
            userASocket1AddTracksSuccessCallbackSpy,
        );

        const userASocket1TracksListUpdateSpy =
            sinon.spy<AllServerToClientEvents['MPE_TRACKS_LIST_UPDATE']>(noop);
        userASocket1.on(
            'MPE_TRACKS_LIST_UPDATE',
            userASocket1TracksListUpdateSpy,
        );

        const tracksToAdd = [datatype.uuid()];
        userASocket1.emit('MPE_ADD_TRACKS', {
            roomID,
            tracksIDs: tracksToAdd,
        });

        await waitFor(() => {
            assert.isTrue(
                userASocket1AddTracksSuccessCallbackSpy.calledOnceWithExactly({
                    roomID,
                    state: roomState,
                }),
            );
        });

        assert.isTrue(userASocket1TracksListUpdateSpy.notCalled);
    });

    test("Sends tracks list update to every other user's devices if adding tracks succeeded", async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const userASocket1 = await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });
        const userASocket2 = await createSocketConnection({
            userID: creatorUserID,
        });
        const roomState = generateMpeWorkflowState({
            roomID,
            roomCreatorUserID: creatorUserID,
        });

        sinon
            .stub(MpeServerToTemporalController, 'addTracks')
            .callsFake(async ({ deviceID }) => {
                setTimeout(async function simulateFail() {
                    const body: MpeAcknowledgeAddingTracksRequestBody = {
                        userID: creatorUserID,
                        deviceID,
                        state: roomState,
                    };

                    await supertest(BASE_URL)
                        .post(
                            urlcat(
                                MPE_TEMPORAL_LISTENER,
                                'acknowledge-adding-tracks',
                            ),
                        )
                        .send(body)
                        .expect(200);
                }, 10);

                return Promise.resolve({
                    ok: 1,
                });
            });

        const userASocket2AddTracksSuccessCallbackSpy =
            sinon.spy<
                AllServerToClientEvents['MPE_ADD_TRACKS_SUCCESS_CALLBACK']
            >(noop);
        userASocket2.on(
            'MPE_ADD_TRACKS_SUCCESS_CALLBACK',
            userASocket2AddTracksSuccessCallbackSpy,
        );

        const userASocket2TracksListUpdateSpy =
            sinon.spy<AllServerToClientEvents['MPE_TRACKS_LIST_UPDATE']>(noop);
        userASocket2.on(
            'MPE_TRACKS_LIST_UPDATE',
            userASocket2TracksListUpdateSpy,
        );

        const tracksToAdd = [datatype.uuid()];
        userASocket1.emit('MPE_ADD_TRACKS', {
            roomID,
            tracksIDs: tracksToAdd,
        });

        await waitFor(() => {
            assert.isTrue(
                userASocket2TracksListUpdateSpy.calledOnceWithExactly({
                    roomID,
                    state: roomState,
                }),
            );
        });

        assert.isTrue(userASocket2AddTracksSuccessCallbackSpy.notCalled);
    });

    test('Sends tracks list update to every other user if adding tracks succeeded', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const userASocket1 = await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });
        const userBSocket1 = await createUserAndGetSocket({
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
            .stub(MpeServerToTemporalController, 'addTracks')
            .callsFake(async ({ deviceID }) => {
                setTimeout(async function simulateFail() {
                    const body: MpeAcknowledgeAddingTracksRequestBody = {
                        userID: creatorUserID,
                        deviceID,
                        state: roomState,
                    };

                    await supertest(BASE_URL)
                        .post(
                            urlcat(
                                MPE_TEMPORAL_LISTENER,
                                'acknowledge-adding-tracks',
                            ),
                        )
                        .send(body)
                        .expect(200);
                }, 10);

                return Promise.resolve({
                    ok: 1,
                });
            });

        const userBSocket1AddTracksSuccessCallbackSpy =
            sinon.spy<
                AllServerToClientEvents['MPE_ADD_TRACKS_SUCCESS_CALLBACK']
            >(noop);
        userBSocket1.on(
            'MPE_ADD_TRACKS_SUCCESS_CALLBACK',
            userBSocket1AddTracksSuccessCallbackSpy,
        );

        const userBSocket1TracksListUpdateSpy =
            sinon.spy<AllServerToClientEvents['MPE_TRACKS_LIST_UPDATE']>(noop);
        userBSocket1.on(
            'MPE_TRACKS_LIST_UPDATE',
            userBSocket1TracksListUpdateSpy,
        );

        const tracksToAdd = [datatype.uuid()];
        userASocket1.emit('MPE_ADD_TRACKS', {
            roomID,
            tracksIDs: tracksToAdd,
        });

        await waitFor(() => {
            assert.isTrue(
                userBSocket1TracksListUpdateSpy.calledOnceWithExactly({
                    roomID,
                    state: roomState,
                }),
            );
        });

        assert.isTrue(userBSocket1AddTracksSuccessCallbackSpy.notCalled);
    });

    test('Sends request to Temporal when deleting tracks', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const userASocket1 = await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });

        const deleteTracksSpy = sinon
            .stub(MpeServerToTemporalController, 'deleteTracks')
            .callsFake(() => {
                return Promise.resolve({
                    ok: 1,
                });
            });

        const tracksToDelete = [datatype.uuid()];
        userASocket1.emit('MPE_DELETE_TRACKS', {
            roomID,
            tracksIDs: tracksToDelete,
        });

        await waitFor(() => {
            assert.isTrue(
                deleteTracksSpy.calledOnceWithExactly({
                    deviceID: sinon.match.string,
                    workflowID: roomID,
                    tracksIDs: tracksToDelete,
                    userID: creatorUserID,
                }),
            );
        });
    });
});
