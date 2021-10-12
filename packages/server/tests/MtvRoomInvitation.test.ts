import Database from '@ioc:Adonis/Lucid/Database';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import MtvRoomInvitation from 'App/Models/MtvRoomInvitation';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { initTestUtils, sleep } from './utils/TestUtils';

test.group(`MtvRoomInvitation tests group`, (group) => {
    const {
        createUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        createSocketConnection,
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

    test('It should create an invitation in base and send RECEIVED_INVITATION to the invited user clients', async (assert) => {
        const invitedUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const creatorSocket = await createUserAndGetSocket({
            userID: creatorUserID,
            mtvRoomIDToAssociate: roomID,
        });
        const invitedUserSocket = await createUserAndGetSocket({
            userID: invitedUserID,
        });
        const invitedUserSocketB = await createSocketConnection({
            userID: invitedUserID,
        });

        const receivedEvents: string[] = [];
        invitedUserSocketB.on('RECEIVED_INVITATION', () =>
            receivedEvents.push('RECEIVED_INVITATION'),
        );
        invitedUserSocket.on('RECEIVED_INVITATION', () =>
            receivedEvents.push('RECEIVED_INVITATION'),
        );

        creatorSocket.emit('CREATOR_INVITE_USER', {
            invitedUserID,
        });
        await sleep();
        assert.equal(receivedEvents.length, 2);
        const createdInvitation = await MtvRoomInvitation.findBy(
            'invited_user_id',
            invitedUserID,
        );

        assert.isNotNull(createdInvitation);
        if (createdInvitation === null) throw new Error('invitation is null');
        assert.equal(createdInvitation.invitingUserID, creatorUserID);
        assert.equal(createdInvitation.invitedUserID, invitedUserID);
        assert.equal(createdInvitation.mtvRoomID, roomID);
    });

    test.only('It should faile to invite user as the inviting user is not the room creator', async (assert) => {
        const invitedUserID = datatype.uuid();
        const normalUserID = datatype.uuid();
        const roomID = datatype.uuid();
        await createUserAndGetSocket({
            userID: datatype.uuid(),
            mtvRoomIDToAssociate: roomID,
        });

        await createUserAndGetSocket({
            userID: normalUserID,
            mtvRoomIDToAssociate: roomID,
        });

        const invitedUserSocket = await createUserAndGetSocket({
            userID: invitedUserID,
        });

        invitedUserSocket.on('RECEIVED_INVITATION', () => assert.isTrue(false));

        try {
            await MtvRoomsWsController.onCreatorInviteUser({
                emitterUserID: normalUserID,
                invitedUserID: invitedUserID,
                roomID,
            });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal(
                message,
                'Emitter user does not appear to be the room creator',
            );
        }
    });
});
