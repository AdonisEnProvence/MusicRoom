import Database from '@ioc:Adonis/Lucid/Database';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { initTestUtils } from './utils/TestUtils';

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

        const socketAddTracksFailCallbackSpy = sinon.spy();
        socket.on(
            'MPE_ADD_TRACKS_FAIL_CALLBACK',
            socketAddTracksFailCallbackSpy,
        );

        socket.emit('MPE_ADD_TRACKS', {
            roomID,
            tracksIDs: [datatype.uuid()],
        });

        await waitFor(async () => {
            assert.isTrue(socketAddTracksFailCallbackSpy.calledOnce);
        });

        assert.isFalse(addTracksSpy.called);
    });

    test('Calls Temporal when adding track in a room the user is member of', async (assert) => {
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

        const addTracksSpy = sinon.stub(
            MpeServerToTemporalController,
            'addTracks',
        );

        const socketAddTracksFailCallbackSpy = sinon.spy();
        socket.on(
            'MPE_ADD_TRACKS_FAIL_CALLBACK',
            socketAddTracksFailCallbackSpy,
        );

        const tracksToAdd = [datatype.uuid()];
        socket.emit('MPE_ADD_TRACKS', {
            roomID,
            tracksIDs: tracksToAdd,
        });

        await waitFor(async () => {
            assert.isTrue(
                addTracksSpy.calledOnceWith({
                    deviceID: sinon.match.string,
                    userID: creatorUserID,
                    tracksIDs: tracksToAdd,
                    workflowID: roomID,
                }),
            );
        });

        assert.isTrue(socketAddTracksFailCallbackSpy.notCalled);
    });
});
