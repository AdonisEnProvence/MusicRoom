import Database from '@ioc:Adonis/Lucid/Database';
import { MtvWorkflowState } from '@musicroom/types';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import { BASE_URL, initTestUtils } from './utils/TestUtils';

test.group(`Mtv room time constraint test group`, (group) => {
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

    test('Sending a request to inside /temporal/acknowledge-time-constraint-update achieves to a "MTV_TIME_CONSTRAINT_UPDATE" into related room', async (assert) => {
        const creatorUserID = datatype.uuid();
        const randomUserID = datatype.uuid();
        const mtvRoomID = datatype.uuid();
        const state: MtvWorkflowState = {
            roomID: mtvRoomID,
            roomCreatorUserID: datatype.uuid(),
            playing: false,
            name: random.word(),
            playingMode: 'BROADCAST',
            currentTrack: null,
            isOpen: true,
            isOpenOnlyInvitedUsersCanVote: false,
            hasTimeAndPositionConstraints: false,
            timeConstraintIsValid: null,
            delegationOwnerUserID: null,
            userRelatedInformation: null,
            usersLength: 1,
            tracks: null,
            minimumScoreToBePlayed: 1,
        };

        const creatorSocket = await createUserAndGetSocket({
            userID: creatorUserID,
            mtvRoomIDToAssociate: mtvRoomID,
        });
        const userBSocket = await createUserAndGetSocket({
            userID: randomUserID,
            mtvRoomIDToAssociate: mtvRoomID,
        });

        const receivedEvents: string[] = [];
        creatorSocket.on('MTV_TIME_CONSTRAINT_UPDATE', () => {
            receivedEvents.push('MTV_TIME_CONSTRAINT_UPDATE');
        });
        userBSocket.on('MTV_TIME_CONSTRAINT_UPDATE', () => {
            receivedEvents.push('MTV_TIME_CONSTRAINT_UPDATE');
        });

        creatorSocket.emit('MTV_UPDATE_CONTROL_AND_DELEGATION_PERMISSION', {
            hasControlAndDelegationPermission: true,
            toUpdateUserID: randomUserID,
        });

        await supertest(BASE_URL)
            .post('/temporal/acknowledge-update-time-constraint')
            .send(state);

        await waitFor(() => {
            assert.equal(receivedEvents.length, 2);
        });
    });
});
