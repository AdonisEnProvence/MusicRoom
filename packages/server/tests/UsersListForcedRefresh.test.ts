import Database from '@ioc:Adonis/Lucid/Database';
import { MtvWorkflowState } from '@musicroom/types';
import { MtvTemporalToServerLeaveBody } from 'App/Controllers/Http/Temporal/MtvTemporalToServerController';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import { BASE_URL, initTestUtils, sleep } from './utils/TestUtils';

function getBasicState({
    userID,
    withUserRelatedInformation,
    roomID,
}: {
    userID: string;
    withUserRelatedInformation?: boolean;
    roomID?: string;
}): MtvWorkflowState {
    return {
        currentTrack: null,
        roomID: roomID ?? datatype.uuid(),
        roomCreatorUserID: userID,
        hasTimeAndPositionConstraints: false,
        isOpen: true,
        delegationOwnerUserID: null,

        isOpenOnlyInvitedUsersCanVote: false,
        timeConstraintIsValid: null,
        playingMode: 'BROADCAST',
        tracks: [
            {
                id: datatype.uuid(),
                artistName: random.word(),
                duration: 42000,
                title: random.words(3),
                score: datatype.number(),
            },
        ],
        playing: false,
        name: random.word(),
        userRelatedInformation: withUserRelatedInformation
            ? {
                  hasControlAndDelegationPermission: true,
                  userID: userID,
                  emittingDeviceID: datatype.uuid(),
                  userHasBeenInvited: false,
                  tracksVotedFor: [],
                  userFitsPositionConstraint: null,
              }
            : null,
        minimumScoreToBePlayed: 1,
        usersLength: 1,
    };
}

test.group(`MtvRoom get users list test group`, (group) => {
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

    test('It should emit users list forced refresh on temporal response for user length update', async (assert) => {
        const userID = datatype.uuid();
        const roomID = datatype.uuid();
        const socket = await createAuthenticatedUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate: roomID,
        });

        let usersListForcedRefreshHasBeenCalled = false;

        socket.on('MTV_USERS_LIST_FORCED_REFRESH', () => {
            usersListForcedRefreshHasBeenCalled = true;
        });

        await supertest(BASE_URL)
            .post('/temporal/mtv/user-length-update')
            .send(getBasicState({ userID, roomID }));

        await sleep();

        assert.isTrue(usersListForcedRefreshHasBeenCalled);
    });

    test('It should emit users list forced refresh on temporal response for update delegation owner', async (assert) => {
        const userID = datatype.uuid();
        const roomID = datatype.uuid();
        const socket = await createAuthenticatedUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate: roomID,
        });

        let usersListForcedRefreshHasBeenCalled = false;

        socket.on('MTV_USERS_LIST_FORCED_REFRESH', () => {
            usersListForcedRefreshHasBeenCalled = true;
        });

        await supertest(BASE_URL)
            .post('/temporal/mtv/acknowledge-update-delegation-owner')
            .send(getBasicState({ userID, roomID }));

        await sleep();

        assert.isTrue(usersListForcedRefreshHasBeenCalled);
    });

    test('It should emit users list forced refresh on temporal response for update control and delegation permission', async (assert) => {
        const userID = datatype.uuid();
        const roomID = datatype.uuid();
        const socket = await createAuthenticatedUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate: roomID,
        });

        let usersListForcedRefreshHasBeenCalled = false;

        socket.on('MTV_USERS_LIST_FORCED_REFRESH', () => {
            usersListForcedRefreshHasBeenCalled = true;
        });

        await supertest(BASE_URL)
            .post(
                '/temporal/mtv/acknowledge-update-control-and-delegation-permission',
            )
            .send(
                getBasicState({
                    userID,
                    roomID,
                    withUserRelatedInformation: true,
                }),
            );

        await sleep();

        assert.isTrue(usersListForcedRefreshHasBeenCalled);
    });

    test('It should emit users list forced refresh on temporal response for leave temporal response', async (assert) => {
        const userID = datatype.uuid();
        const roomID = datatype.uuid();
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate: roomID,
        });

        let usersListForcedRefreshHasBeenCalled = false;
        creatorSocket.on('MTV_USERS_LIST_FORCED_REFRESH', () => {
            usersListForcedRefreshHasBeenCalled = true;
        });

        const leaveBody: MtvTemporalToServerLeaveBody = {
            leavingUserID: datatype.uuid(),
            state: getBasicState({
                userID,
                roomID,
                withUserRelatedInformation: true,
            }),
        };
        await supertest(BASE_URL).post('/temporal/mtv/leave').send(leaveBody);

        await sleep();

        assert.isTrue(usersListForcedRefreshHasBeenCalled);
    });
});
