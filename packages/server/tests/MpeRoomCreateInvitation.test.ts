import Database from '@ioc:Adonis/Lucid/Database';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import MpeRoomsWsController from 'App/Controllers/Ws/MpeRoomsWsController';
import MpeRoom from 'App/Models/MpeRoom';
import MpeRoomInvitation from 'App/Models/MpeRoomInvitation';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import invariant from 'tiny-invariant';
import { createSpyOnClientSocketEvent, initTestUtils } from './utils/TestUtils';

test.group(`MpeRoomInvitation tests group`, (group) => {
    const {
        createAuthenticatedUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        createSocketConnection,
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

    test('It should create only one invitation in base and send MPE_RECEIVED_ROOM_INVITATION to the invited user clients', async (assert) => {
        const invitedUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });
        const invitedUserSocket = await createAuthenticatedUserAndGetSocket({
            userID: invitedUserID,
        });
        const invitedUserSocketB = await createSocketConnection({
            userID: invitedUserID,
        });

        //invited user spies
        const invitedUserReceiveMpeRoomInvitationSpy =
            createSpyOnClientSocketEvent(
                invitedUserSocket,
                'MPE_RECEIVED_ROOM_INVITATION',
            );

        const invitedUserSocketBReceiveMpeRoomInvitationSpy =
            createSpyOnClientSocketEvent(
                invitedUserSocketB,
                'MPE_RECEIVED_ROOM_INVITATION',
            );

        const creatorReceivedMpeRoomInvitationSpy =
            createSpyOnClientSocketEvent(
                creatorSocket,
                'MPE_RECEIVED_ROOM_INVITATION',
            );
        ///

        creatorSocket.emit('MPE_CREATOR_INVITE_USER', {
            roomID,
            invitedUserID,
        });

        await waitFor(async () => {
            assert.isTrue(invitedUserReceiveMpeRoomInvitationSpy.calledOnce);
            assert.isTrue(
                invitedUserSocketBReceiveMpeRoomInvitationSpy.calledOnce,
            );
            assert.isTrue(creatorReceivedMpeRoomInvitationSpy.notCalled);
        });

        const createdInvitation = await MpeRoomInvitation.findBy(
            'invited_user_id',
            invitedUserID,
        );
        assert.isNotNull(createdInvitation);
        invariant(createdInvitation !== null, 'invitation is null');

        assert.equal(createdInvitation.invitingUserID, creatorUserID);
        assert.equal(createdInvitation.invitedUserID, invitedUserID);
        assert.equal(createdInvitation.mpeRoomID, roomID);

        //Again and check events are still called but only 1 entry in db
        creatorSocket.emit('MPE_CREATOR_INVITE_USER', {
            invitedUserID,
            roomID,
        });

        await waitFor(async () => {
            assert.isTrue(invitedUserReceiveMpeRoomInvitationSpy.calledTwice);
            assert.isTrue(
                invitedUserSocketBReceiveMpeRoomInvitationSpy.calledTwice,
            );
            assert.isTrue(creatorReceivedMpeRoomInvitationSpy.notCalled);
        });

        const allInvitations = await MpeRoomInvitation.all();
        assert.equal(allInvitations.length, 1);

        const mpeRoom = await MpeRoom.findOrFail(roomID);
        await mpeRoom.load('invitations');

        assert.equal(mpeRoom.invitations.length, 1);
    });

    test('It should fail to invite user as invitedUser is creator himself', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();

        const socket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });

        const mpeRoomReceivedInvitationSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_RECEIVED_ROOM_INVITATION',
        );

        try {
            await MpeRoomsWsController.onCreatorInviteUser({
                invitingUserID: creatorUserID,
                invitedUserID: creatorUserID,
                roomID,
            });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal((await MpeRoomInvitation.all()).length, 0);
            assert.equal(
                message,
                'Creator cannot invite himself in his mpe room',
            );
            assert.isTrue(mpeRoomReceivedInvitationSpy.notCalled);
        }
    });

    test('It should fail to invite user as the inviting user is not the mpe room creator', async (assert) => {
        const invitedUserID = datatype.uuid();
        const normalUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [{ roomID }],
        });

        await createAuthenticatedUserAndGetSocket({
            userID: normalUserID,
            mpeRoomIDToAssociate: [{ roomID }],
        });

        const invitedUserSocket = await createAuthenticatedUserAndGetSocket({
            userID: invitedUserID,
        });

        const invitedUserReceivedMpeRoomInvitationSpy =
            createSpyOnClientSocketEvent(
                invitedUserSocket,
                'MPE_RECEIVED_ROOM_INVITATION',
            );

        try {
            await MpeRoomsWsController.onCreatorInviteUser({
                invitingUserID: normalUserID,
                invitedUserID: invitedUserID,
                roomID,
            });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal((await MpeRoomInvitation.all()).length, 0);
            assert.equal(
                message,
                'Emitter user does not appear to be the mpe room creator',
            );
            assert.isTrue(invitedUserReceivedMpeRoomInvitationSpy.notCalled);
        }
    });

    test('It should fail to invite user as invited user is already in the mpe room', async (assert) => {
        const invitedUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [{ roomID }],
        });

        const invitedUserSocket = await createAuthenticatedUserAndGetSocket({
            userID: invitedUserID,
            mpeRoomIDToAssociate: [{ roomID }],
        });

        const invitedUserSocketMpeRoomInvitationSpy =
            createSpyOnClientSocketEvent(
                invitedUserSocket,
                'MPE_RECEIVED_ROOM_INVITATION',
            );

        try {
            await MpeRoomsWsController.onCreatorInviteUser({
                invitingUserID: creatorUserID,
                invitedUserID: invitedUserID,
                roomID,
            });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal((await MpeRoomInvitation.all()).length, 0);
            assert.equal(message, 'Invited user is already in the mpe room');
            assert.isTrue(invitedUserSocketMpeRoomInvitationSpy.notCalled);
        }
    });

    //Indeed we kinda test lucid relationship right here.
    //But it's important to keep testing that no one breaks this behavior
    test('It should remove every deleted room related invitations thanks to lucid relationships', async (assert) => {
        const invitedUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();

        const creatorSocket = await createAuthenticatedUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [{ roomID }],
        });
        const invitedUserSocket = await createAuthenticatedUserAndGetSocket({
            userID: invitedUserID,
        });

        const invitedUserReceivedMpeRoomInvitationSpy =
            createSpyOnClientSocketEvent(
                invitedUserSocket,
                'MPE_RECEIVED_ROOM_INVITATION',
            );

        creatorSocket.emit('MPE_CREATOR_INVITE_USER', {
            roomID,
            invitedUserID,
        });

        await waitFor(() => {
            assert.isTrue(invitedUserReceivedMpeRoomInvitationSpy.calledOnce);
        });

        const createdInvitation = await MpeRoomInvitation.findBy(
            'invited_user_id',
            invitedUserID,
        );
        assert.isNotNull(createdInvitation);

        sinon
            .stub(MpeServerToTemporalController, 'terminateWorkflow')
            .callsFake(async ({ workflowID }) => {
                assert.equal(roomID, workflowID);

                return {
                    ok: 1,
                };
            });

        //Creator leaves his room, it should then be deleted
        creatorSocket.emit('MPE_LEAVE_ROOM', {
            roomID,
        });

        await waitFor(async () => {
            const allRooms = await MpeRoom.all();
            assert.equal(allRooms.length, 0);

            const allInvitations = await MpeRoomInvitation.all();
            assert.equal(allInvitations.length, 0);
        });
    });
});
