import Database from '@ioc:Adonis/Lucid/Database';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import MtvRoom from 'App/Models/MtvRoom';
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
        disconnectSocket,
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

    test('It should create only one invitation in base and send MTV_RECEIVED_ROOM_INVITATION to the invited user clients', async (assert) => {
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
        invitedUserSocketB.on('MTV_RECEIVED_ROOM_INVITATION', () =>
            receivedEvents.push('MTV_RECEIVED_ROOM_INVITATION'),
        );
        invitedUserSocket.on('MTV_RECEIVED_ROOM_INVITATION', () =>
            receivedEvents.push('MTV_RECEIVED_ROOM_INVITATION'),
        );

        creatorSocket.emit('MTV_CREATOR_INVITE_USER', {
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

        //Again and check events are still called but only 1 entry in db
        creatorSocket.emit('MTV_CREATOR_INVITE_USER', {
            invitedUserID,
        });
        await sleep();
        assert.equal(receivedEvents.length, 4);
        const allInvitations = await MtvRoomInvitation.all();
        assert.equal(allInvitations.length, 1);
    });

    test('It should fail to invite user as invitedUser is creator himself', async (assert) => {
        const invitedUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();

        await createUserAndGetSocket({
            userID: creatorUserID,
            mtvRoomIDToAssociate: roomID,
        });

        const invitedUserSocket = await createUserAndGetSocket({
            userID: invitedUserID,
        });

        invitedUserSocket.on('MTV_RECEIVED_ROOM_INVITATION', () =>
            assert.isTrue(false),
        );

        try {
            await MtvRoomsWsController.onCreatorInviteUser({
                emitterUserID: creatorUserID,
                invitedUserID: creatorUserID,
                roomID,
            });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal((await MtvRoomInvitation.all()).length, 0);
            assert.equal(message, 'Creator cannot invite himself in his room');
        }
    });

    test('It should fail to invite user as the inviting user is not the room creator', async (assert) => {
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

        invitedUserSocket.on('MTV_RECEIVED_ROOM_INVITATION', () =>
            assert.isTrue(false),
        );

        try {
            await MtvRoomsWsController.onCreatorInviteUser({
                emitterUserID: normalUserID,
                invitedUserID: invitedUserID,
                roomID,
            });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal((await MtvRoomInvitation.all()).length, 0);
            assert.equal(
                message,
                'Emitter user does not appear to be the room creator',
            );
        }
    });

    test('It should fail to invite user as invited user is already in the room', async (assert) => {
        const invitedUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        await createUserAndGetSocket({
            userID: creatorUserID,
            mtvRoomIDToAssociate: roomID,
        });

        const invitedUserSocket = await createUserAndGetSocket({
            userID: invitedUserID,
            mtvRoomIDToAssociate: roomID,
        });

        invitedUserSocket.on('MTV_RECEIVED_ROOM_INVITATION', () =>
            assert.isTrue(false),
        );

        try {
            await MtvRoomsWsController.onCreatorInviteUser({
                emitterUserID: creatorUserID,
                invitedUserID: invitedUserID,
                roomID,
            });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal((await MtvRoomInvitation.all()).length, 0);
            assert.equal(message, 'Invited user is already in the room');
        }
    });

    //Indeed we kinda test lucid relationship right here.
    //But it's important to keep testing that no one breaks this behavior
    test('It should remove every deleted room related invitations thanks to lucid relationships', async (assert) => {
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

        let callbackCalled = false;
        invitedUserSocket.on('MTV_RECEIVED_ROOM_INVITATION', () => {
            callbackCalled = true;
        });

        creatorSocket.emit('MTV_CREATOR_INVITE_USER', {
            invitedUserID,
        });

        await waitFor(() => {
            assert.isTrue(callbackCalled);
        });

        const createdInvitation = await MtvRoomInvitation.findBy(
            'invited_user_id',
            invitedUserID,
        );
        assert.isNotNull(createdInvitation);

        await disconnectSocket(creatorSocket);

        await waitFor(async () => {
            const allRooms = await MtvRoom.all();
            assert.equal(allRooms.length, 0);
        });

        const allInvitations = await MtvRoomInvitation.all();
        assert.equal(allInvitations.length, 0);
    });
});
