import Database from '@ioc:Adonis/Lucid/Database';
import {
    MpeRequestMtvRoomCreationRequestBody,
    MtvCreateWorkflowResponse,
    MtvRoomCreationOptionsWithoutInitialTracksIDs,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import { datatype, random, name } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import { MPE_TEMPORAL_LISTENER, MTV_TEMPORAL_LISTENER } from '../start/routes';
import {
    BASE_URL,
    initTestUtils,
    createSpyOnClientSocketEvent,
} from './utils/TestUtils';

test.group('MPE Export to MTV', (group) => {
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

    test('Exporting a MPE room creates a MTV room', async (assert) => {
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
        const mtvRoomOptions: MtvRoomCreationOptionsWithoutInitialTracksIDs = {
            name: random.words(),
            isOpen: true,
            isOpenOnlyInvitedUsersCanVote: false,
            hasPhysicalAndTimeConstraints: false,
            minimumScoreToBePlayed: 1,
            playingMode: 'BROADCAST',
        };
        const mpeRoomInitialTracksIDs = [datatype.uuid(), datatype.uuid()];

        sinon
            .stub(MpeServerToTemporalController, 'exportToMtv')
            .callsFake((args) => {
                assert.equal(args.workflowID, roomID);
                assert.equal(args.userID, creatorUserID);
                assert.deepEqual(args.mtvRoomOptions, mtvRoomOptions);

                setTimeout(async function sendMtvRoomCreationRequest() {
                    const body: MpeRequestMtvRoomCreationRequestBody = {
                        userID: args.userID,
                        deviceID: args.deviceID,
                        mtvRoomOptions: args.mtvRoomOptions,
                        tracksIDs: mpeRoomInitialTracksIDs,
                    };

                    await supertest(BASE_URL)
                        .post(
                            urlcat(
                                MPE_TEMPORAL_LISTENER,
                                'request-mtv-room-creation',
                            ),
                        )
                        .send(body)
                        .expect(200);
                }, 10);

                return Promise.resolve({
                    ok: 1,
                });
            });
        sinon
            .stub(MtvServerToTemporalController, 'createMtvWorkflow')
            .callsFake(async ({ workflowID, params }) => {
                const mtvRoomState: MtvCreateWorkflowResponse = {
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
                            userID: creatorUserID,
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

                setTimeout(async function sendCreationAcknowledgementRequest() {
                    const body: MtvWorkflowStateWithUserRelatedInformation =
                        mtvRoomState.state;

                    await supertest(BASE_URL)
                        .post(
                            urlcat(
                                MTV_TEMPORAL_LISTENER,
                                '/mtv-creation-acknowledgement',
                            ),
                        )
                        .send(body);
                }, 10);

                return mtvRoomState;
            });

        const userASocket1CreateRoomCallbackSpy = createSpyOnClientSocketEvent(
            userASocket1,
            'MTV_CREATE_ROOM_CALLBACK',
        );
        const userASocket1CreateRoomSynchedCallbackSpy =
            createSpyOnClientSocketEvent(
                userASocket1,
                'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
            );

        userASocket1.emit('MPE_EXPORT_TO_MTV', {
            roomID,
            mtvRoomOptions,
        });

        await Promise.all([
            waitFor(() => {
                assert.isTrue(userASocket1CreateRoomCallbackSpy.calledOnce);
            }),
            waitFor(() => {
                assert.isTrue(
                    userASocket1CreateRoomSynchedCallbackSpy.calledOnce,
                );
            }),
        ]);
    });
});
