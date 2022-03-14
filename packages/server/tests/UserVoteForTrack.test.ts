import Database from '@ioc:Adonis/Lucid/Database';
import {
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import {
    BASE_URL,
    createSpyOnClientSocketEvent,
    getSocketApiAuthToken,
    initTestUtils,
} from './utils/TestUtils';

test.group(`User service socket handler tests`, (group) => {
    const {
        createAuthenticatedUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        createSocketConnection,
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

    test("After a user vote for a track it should send back the voting user a specific event and to others room's member a global update", async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();

        const userBID = datatype.uuid();
        const userCID = datatype.uuid();

        const state: MtvWorkflowState = {
            currentTrack: null,
            playingMode: 'BROADCAST',
            minimumScoreToBePlayed: 1,
            name: random.word(),
            playing: false,
            isOpen: true,
            isOpenOnlyInvitedUsersCanVote: false,
            roomCreatorUserID: creatorUserID,
            delegationOwnerUserID: null,
            roomID,
            tracks: null,
            userRelatedInformation: null,
            usersLength: 3,
            hasTimeAndPositionConstraints: false,
            timeConstraintIsValid: null,
        };

        sinon
            .stub(MtvServerToTemporalController, 'voteForTrack')
            .callsFake(async ({ trackID, userID }) => {
                const stateWithUserRelatedInformations: MtvWorkflowStateWithUserRelatedInformation =
                    {
                        ...state,
                        userRelatedInformation: {
                            hasControlAndDelegationPermission: true,
                            userHasBeenInvited: false,
                            userFitsPositionConstraint: null,
                            emittingDeviceID: datatype.uuid(),
                            tracksVotedFor: [trackID],
                            userID,
                        },
                    };

                await supertest(BASE_URL)
                    .post('/temporal/mtv/acknowledge-user-vote-for-track')
                    .send({
                        ...stateWithUserRelatedInformations,
                    });

                await supertest(BASE_URL)
                    .post('/temporal/mtv/suggest-or-vote-update')
                    .send({
                        ...state,
                    });

                return;
            });

        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mtvRoomIDToAssociate: roomID,
        });
        const creatorToken = getSocketApiAuthToken(creatorSocket);
        const creatorSocketB = await createSocketConnection({
            userID: creatorUserID,
            token: creatorToken,
        });

        const userBSocket = await createAuthenticatedUserAndGetSocket({
            userID: userBID,
            mtvRoomIDToAssociate: roomID,
        });
        const userBToken = getSocketApiAuthToken(userBSocket);
        const userBSocketB = await createSocketConnection({
            userID: userBID,
            token: userBToken,
        });

        const userCSocket = await createAuthenticatedUserAndGetSocket({
            userID: userCID,
            mtvRoomIDToAssociate: roomID,
        });
        const userCToken = getSocketApiAuthToken(userCSocket);
        const userCSocketB = await createSocketConnection({
            userID: userCID,
            token: userCToken,
        });

        const creatorSocketVoteOrSuggestCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MTV_VOTE_OR_SUGGEST_TRACK_CALLBACK',
            );
        const creatorSocketBVoteOrSuggestCallbackSpy =
            createSpyOnClientSocketEvent(
                creatorSocketB,
                'MTV_VOTE_OR_SUGGEST_TRACK_CALLBACK',
            );

        const creatorSocketListUpdate = createSpyOnClientSocketEvent(
            creatorSocket,
            'MTV_VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
        );

        const creatorSocketBListUpdate = createSpyOnClientSocketEvent(
            creatorSocketB,
            'MTV_VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
        );

        const userBSocketListUpdate = createSpyOnClientSocketEvent(
            userBSocket,
            'MTV_VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
        );

        const userBSocketBListUpdate = createSpyOnClientSocketEvent(
            userBSocketB,
            'MTV_VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
        );

        const userCSocketListUpdate = createSpyOnClientSocketEvent(
            userCSocket,
            'MTV_VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
        );

        const userCSocketBListUpdate = createSpyOnClientSocketEvent(
            userCSocketB,
            'MTV_VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
        );

        creatorSocket.emit('MTV_VOTE_FOR_TRACK', {
            trackID: datatype.uuid(),
        });

        await waitFor(() => {
            //Creator
            assert.isTrue(creatorSocketVoteOrSuggestCallbackSpy.calledOnce);
            assert.isTrue(creatorSocketBVoteOrSuggestCallbackSpy.calledOnce);
            assert.isTrue(creatorSocketListUpdate.calledOnce);
            assert.isTrue(creatorSocketBListUpdate.calledOnce);

            //UserB
            assert.isTrue(userBSocketListUpdate.calledOnce);
            assert.isTrue(userBSocketBListUpdate.calledOnce);

            //UserC
            assert.isTrue(userCSocketListUpdate.calledOnce);
            assert.isTrue(userCSocketBListUpdate.calledOnce);
        });
    });
});
