import Database from '@ioc:Adonis/Lucid/Database';
import { MpeCreateWorkflowResponse } from '@musicroom/types';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import MpeRoom from 'App/Models/MpeRoom';
import User from 'App/Models/User';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import {
    getDefaultMpeRoomCreateRoomArgs,
    initTestUtils,
} from './utils/TestUtils';

test.group(`mpe rooms relationship tests`, (group) => {
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

    test('It should create MPE room ', async (assert) => {
        const creatorUserID = datatype.uuid();
        const creatorSocket = await createUserAndGetSocket({
            userID: creatorUserID,
        });
        const settings = getDefaultMpeRoomCreateRoomArgs();

        sinon
            .stub(MpeServerToTemporalController, 'createMpeWorkflow')
            .callsFake(
                async ({
                    workflowID,
                    userID,
                    name,
                    isOpenOnlyInvitedUsersCanVote,
                    isOpen,
                    initialTrackID,
                }) => {
                    const response: MpeCreateWorkflowResponse = {
                        runID: datatype.uuid(),
                        workflowID,
                        state: {
                            name,
                            isOpen,

                            roomID: workflowID,
                            roomCreatorUserID: userID,
                            isOpenOnlyInvitedUsersCanVote,
                            usersLength: 1,
                            playlistTotalDuration: 42,
                            playlistTracksLength: 42,
                            tracks: [
                                {
                                    id: initialTrackID,
                                    artistName: random.word(),
                                    duration: 42000,
                                    title: random.words(3),
                                    score: datatype.number(),
                                },
                            ],
                        },
                    };
                    return response;
                },
            );

        creatorSocket.emit('MPE_CREATE_ROOM', settings);

        await waitFor(async () => {
            const room = await MpeRoom.all();
            assert.equal(room.length, 1);
        });

        const user = await User.findOrFail(creatorUserID);
        await user.load('mpeRooms');

        if (user.mpeRooms === null) {
            assert.isTrue(false);
            throw new Error('user mpeRooms are null');
        }

        assert.equal(user.mpeRooms.length, 1);
        const createdRoom = await MpeRoom.findOrFail(user.mpeRooms[0].uuid);

        assert.equal(createdRoom.creatorID, creatorUserID);

        await createdRoom.load('members');
        await createdRoom.load('creator');

        if (createdRoom.creator === null || createdRoom.members === null) {
            assert.isTrue(false);
            throw new Error('createdRoom creator or members are or is null');
        }

        assert.equal(createdRoom.creator.uuid, creatorUserID);
        assert.equal(createdRoom.members.length, 1);
        assert.equal(createdRoom.members[0].uuid, creatorUserID);
    });
});
