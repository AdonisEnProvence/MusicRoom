import Database from '@ioc:Adonis/Lucid/Database';
import { MtvRoomClientToServerCreateArgs } from '@musicroom/types';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import MtvRoom from 'App/Models/MtvRoom';
import { datatype, name, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import {
    getDefaultMtvRoomCreateRoomArgs,
    initTestUtils,
    sleep,
} from './utils/TestUtils';

test.group(`MtvRoom create room with advanced settings`, (group) => {
    const {
        createAuthenticatedUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
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

    test('It should fail to create mtv room with corrupted settings', async (assert) => {
        const userID = datatype.uuid();

        const socket = await createAuthenticatedUserAndGetSocket({
            userID,
        });

        const settingsList: MtvRoomClientToServerCreateArgs[] = [
            {
                hasPhysicalAndTimeConstraints: true,
                physicalAndTimeConstraints: undefined,
                initialTracksIDs: [],
                isOpen: false,
                isOpenOnlyInvitedUsersCanVote: false,
                name: random.word(),
                minimumScoreToBePlayed: 1,
                playingMode: 'BROADCAST',
            },
            {
                hasPhysicalAndTimeConstraints: false,
                physicalAndTimeConstraints: {
                    physicalConstraintEndsAt: datatype
                        .datetime()
                        .toDateString(),
                    physicalConstraintStartsAt: datatype
                        .datetime()
                        .toDateString(),
                    physicalConstraintPlaceID: random.words(4),
                    physicalConstraintRadius: datatype.number(),
                },
                initialTracksIDs: [],
                isOpen: false,
                isOpenOnlyInvitedUsersCanVote: false,
                name: random.word(),
                minimumScoreToBePlayed: 1,
                playingMode: 'BROADCAST',
            },
            {
                hasPhysicalAndTimeConstraints: true,
                physicalAndTimeConstraints: undefined,
                initialTracksIDs: [],
                isOpen: false,
                isOpenOnlyInvitedUsersCanVote: true,
                name: random.word(),
                minimumScoreToBePlayed: 1,
                playingMode: 'BROADCAST',
            },
        ];

        settingsList.forEach((settings) =>
            socket.emit('MTV_CREATE_ROOM', settings),
        );
        await sleep();

        const roomCreationFailed = (await MtvRoom.all()).length === 0;
        assert.isTrue(roomCreationFailed);
    });

    test('A public room is persisted correctly in database', async (assert) => {
        const userID = datatype.uuid();
        const socket = await createAuthenticatedUserAndGetSocket({
            userID,
        });
        const settings = getDefaultMtvRoomCreateRoomArgs({
            isOpen: true,
        });
        sinon
            .stub(MtvServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID, params }) => {
                return {
                    runID: datatype.uuid(),
                    workflowID,
                    state: {
                        name: params.name,
                        isOpen: params.isOpen,

                        roomID: workflowID,
                        roomCreatorUserID: datatype.uuid(),
                        delegationOwnerUserID: null,
                        hasTimeAndPositionConstraints: false,
                        isOpenOnlyInvitedUsersCanVote: false,
                        timeConstraintIsValid: null,
                        playing: false,
                        playingMode: 'BROADCAST',
                        currentTrack: null,
                        userRelatedInformation: {
                            userID,
                            emittingDeviceID: datatype.uuid(),
                            tracksVotedFor: [],
                            userFitsPositionConstraint: null,
                            hasControlAndDelegationPermission: true,
                            userHasBeenInvited: false,
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
                        minimumScoreToBePlayed: 1,
                    },
                };
            });

        socket.emit('MTV_CREATE_ROOM', settings);
        await sleep();

        const createdRoom = await MtvRoom.findBy('name', settings.name);
        assert.isNotNull(createdRoom);
        assert.isTrue(createdRoom?.isOpen);
    });

    test('A private room is persisted correctly in database', async (assert) => {
        const userID = datatype.uuid();
        const socket = await createAuthenticatedUserAndGetSocket({
            userID,
        });
        const settings = getDefaultMtvRoomCreateRoomArgs({
            isOpen: false,
        });
        sinon
            .stub(MtvServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID, params }) => {
                return {
                    runID: datatype.uuid(),
                    workflowID,
                    state: {
                        name: params.name,
                        isOpen: params.isOpen,

                        roomID: workflowID,
                        roomCreatorUserID: datatype.uuid(),
                        delegationOwnerUserID: null,
                        hasTimeAndPositionConstraints: false,
                        isOpenOnlyInvitedUsersCanVote: false,
                        timeConstraintIsValid: null,
                        playing: false,
                        playingMode: 'BROADCAST',
                        currentTrack: null,
                        userRelatedInformation: {
                            userID,
                            emittingDeviceID: datatype.uuid(),
                            tracksVotedFor: [],
                            userFitsPositionConstraint: null,
                            userHasBeenInvited: false,
                            hasControlAndDelegationPermission: true,
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
                        minimumScoreToBePlayed: 1,
                    },
                };
            });

        socket.emit('MTV_CREATE_ROOM', settings);
        await sleep();

        const createdRoom = await MtvRoom.findBy('name', settings.name);
        assert.isNotNull(createdRoom);
        assert.isFalse(createdRoom?.isOpen);
    });
});
