import Database from '@ioc:Adonis/Lucid/Database';
import {
    AllServerToClientEvents,
    MpeRejectAddingTracksRequestBody,
} from '@musicroom/types';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import { MPE_TEMPORAL_LISTENER } from '../start/routes';
import { BASE_URL, initTestUtils } from './utils/TestUtils';

function noop() {
    return undefined;
}

test.group('MPE Rooms Tracks List Editing', (group) => {
    const {
        createUserAndGetSocket,
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
});
