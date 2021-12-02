import Database from '@ioc:Adonis/Lucid/Database';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { initTestUtils, sleep } from './utils/TestUtils';

test.group(`Updating Control and Delegation permission`, (group) => {
    const {
        createUserAndGetSocket,
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

    test('Creator can update permission', async (assert) => {
        const creatorUserID = datatype.uuid();
        const randomUserID = datatype.uuid();
        const mtvRoomID = datatype.uuid();

        const creatorSocket = await createUserAndGetSocket({
            userID: creatorUserID,
            mtvRoomIDToAssociate: mtvRoomID,
        });
        await createUserAndGetSocket({
            userID: randomUserID,
            mtvRoomIDToAssociate: mtvRoomID,
        });
        let mockHasBeenCalled = false;
        sinon
            .stub(
                MtvServerToTemporalController,
                'updateControlAndDelegationPermission',
            )
            .callsFake(async () => {
                mockHasBeenCalled = true;

                return;
            });

        creatorSocket.emit('MTV_UPDATE_CONTROL_AND_DELEGATION_PERMISSION', {
            hasControlAndDelegationPermission: true,
            toUpdateUserID: randomUserID,
        });

        await sleep();

        assert.isTrue(mockHasBeenCalled);
    });

    test('Non-creator can not update permission', async (assert) => {
        const creatorUserID = datatype.uuid();
        const randomUserID = datatype.uuid();
        const mtvRoomID = datatype.uuid();

        await createUserAndGetSocket({
            userID: creatorUserID,
            mtvRoomIDToAssociate: mtvRoomID,
        });
        const randomUserSocket = await createUserAndGetSocket({
            userID: randomUserID,
            mtvRoomIDToAssociate: mtvRoomID,
        });
        let mockHasBeenCalled = false;
        sinon
            .stub(
                MtvServerToTemporalController,
                'updateControlAndDelegationPermission',
            )
            .callsFake(async () => {
                mockHasBeenCalled = true;

                return;
            });

        randomUserSocket.emit('MTV_UPDATE_CONTROL_AND_DELEGATION_PERMISSION', {
            hasControlAndDelegationPermission: false,
            toUpdateUserID: creatorUserID,
        });

        await sleep();

        assert.isFalse(mockHasBeenCalled);
    });
});
