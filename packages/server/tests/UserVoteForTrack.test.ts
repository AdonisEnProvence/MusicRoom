import Database from '@ioc:Adonis/Lucid/Database';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import {
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from '../../types/dist';
import { BASE_URL, initTestUtils, sleep } from './utils/TestUtils';

test.group(`User service socket handler tests`, (group) => {
    const {
        createUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        createSocketConnection,
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
            roomID,
            tracks: null,
            userRelatedInformation: null,
            usersLength: 3,
            hasTimeAndPositionConstraints: false,
            timeConstraintIsValid: null,
        };

        sinon
            .stub(ServerToTemporalController, 'voteForTrack')
            .callsFake(async ({ trackID, userID }) => {
                console.log('SALUT LE SANG');
                const stateWithUserRelatedInformations: MtvWorkflowStateWithUserRelatedInformation =
                    {
                        ...state,
                        userRelatedInformation: {
                            userFitsPositionConstraint: null,
                            emittingDeviceID: datatype.uuid(),
                            tracksVotedFor: [trackID],
                            userID,
                        },
                    };

                await supertest(BASE_URL)
                    .post('/temporal/acknowledge-user-vote-for-track')
                    .send({
                        ...stateWithUserRelatedInformations,
                    });

                await supertest(BASE_URL)
                    .post('/temporal/suggest-or-vote-update')
                    .send({
                        ...state,
                    });

                return;
            });

        const creatorSocket = {
            socket: await createUserAndGetSocket({
                userID: creatorUserID,
                mtvRoomIDToAssociate: roomID,
            }),
            socketB: await createSocketConnection({ userID: creatorUserID }),
            receivedEvents: [] as string[],
        };

        const userBSocket = {
            socket: await createUserAndGetSocket({
                userID: userBID,
                mtvRoomIDToAssociate: roomID,
            }),
            socketB: await createSocketConnection({ userID: userBID }),
            receivedEvents: [] as string[],
        };

        const userCSocket = {
            socket: await createUserAndGetSocket({
                userID: userCID,
                mtvRoomIDToAssociate: roomID,
            }),
            socketB: await createSocketConnection({ userID: userCID }),
            receivedEvents: [] as string[],
        };

        creatorSocket.socket.once('VOTE_OR_SUGGEST_TRACK_CALLBACK', () =>
            creatorSocket.receivedEvents.push('VOTE_OR_SUGGEST_TRACK_CALLBACK'),
        );

        creatorSocket.socketB.once('VOTE_OR_SUGGEST_TRACK_CALLBACK', () =>
            creatorSocket.receivedEvents.push('VOTE_OR_SUGGEST_TRACK_CALLBACK'),
        );

        const members = [creatorSocket, userBSocket, userCSocket];
        members.forEach((socket) => {
            socket.socket.once('VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE', () =>
                socket.receivedEvents.push(
                    'VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
                ),
            );

            socket.socketB.once('VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE', () =>
                socket.receivedEvents.push(
                    'VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
                ),
            );
        });

        creatorSocket.socket.emit('VOTE_FOR_TRACK', {
            trackID: datatype.uuid(),
        });
        await sleep();
        await sleep();

        assert.equal(creatorSocket.receivedEvents.length, 4);
        assert.equal(userBSocket.receivedEvents.length, 2);
        assert.equal(userCSocket.receivedEvents.length, 2);
    });
});
