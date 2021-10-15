import Database from '@ioc:Adonis/Lucid/Database';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import MtvRoom from 'App/Models/MtvRoom';
import MtvRoomInvitation from 'App/Models/MtvRoomInvitation';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { initTestUtils } from './utils/TestUtils';

test.group(`Invited user joins mtv room`, (group) => {
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

    test('It should find the user and room related invitation when user joins the room', async (assert) => {
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

        let mockReceivedUserHasBeenInvitedToTrue = false;
        sinon
            .stub(ServerToTemporalController, 'joinWorkflow')
            .callsFake(async ({ userHasBeenInvited }) => {
                mockReceivedUserHasBeenInvitedToTrue = userHasBeenInvited;
            });

        creatorSocket.emit('CREATOR_INVITE_USER', {
            invitedUserID,
        });

        await waitFor(async () => {
            const createdInvitation = await MtvRoomInvitation.findBy(
                'invited_user_id',
                invitedUserID,
            );
            assert.isNotNull(createdInvitation);
        });

        invitedUserSocket.emit('JOIN_ROOM', {
            roomID,
        });

        await waitFor(() => {
            assert.isTrue(mockReceivedUserHasBeenInvitedToTrue);
        });

        const allMtvRoomInvitations = await MtvRoomInvitation.all();
        assert.equal(allMtvRoomInvitations.length, 1);
    });

    test('onJoin should throw error as the room is private and joining user doesnot have invitation', async (assert) => {
        const joiningUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();

        await createUserAndGetSocket({
            userID: creatorUserID,
            mtvRoomIDToAssociate: roomID,
        });

        const createdRoom = await MtvRoom.find(roomID);
        if (createdRoom === null) {
            throw new Error('createdRoom is null');
        }
        createdRoom.isOpen = false;
        await createdRoom.save();

        await createUserAndGetSocket({
            userID: joiningUserID,
        });

        const joiningRoom = await waitFor(async () => {
            const matchingRoom = await MtvRoom.find(roomID);
            assert.isNotNull(matchingRoom);
            return matchingRoom;
        });

        if (joiningRoom === null) {
            throw new Error('joiningRoom is null');
        }

        try {
            await MtvRoomsWsController.onJoin({
                deviceID: datatype.uuid(),
                joiningRoom,
                userID: joiningUserID,
            });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal(
                message,
                'onJoin failed, user has to be invited to join a private room',
            );
        }
    });

    test("It should make the user joins the room, with hasBeenInvited to false as he's not invited", async (assert) => {
        const joiningUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();

        await createUserAndGetSocket({
            userID: creatorUserID,
            mtvRoomIDToAssociate: roomID,
        });
        const joiningUserSocket = await createUserAndGetSocket({
            userID: joiningUserID,
        });

        let mockReceivedUserHasBeenInvitedToFalse = false;
        sinon
            .stub(ServerToTemporalController, 'joinWorkflow')
            .callsFake(async ({ userHasBeenInvited }) => {
                mockReceivedUserHasBeenInvitedToFalse = !userHasBeenInvited;
            });

        joiningUserSocket.emit('JOIN_ROOM', {
            roomID,
        });

        await waitFor(() => {
            assert.isTrue(mockReceivedUserHasBeenInvitedToFalse);
        });
    });
});
