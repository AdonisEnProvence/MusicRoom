import Database from '@ioc:Adonis/Lucid/Database';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { createSpyOnClientSocketEvent, initTestUtils } from './utils/TestUtils';

test.group(`user receives MpeRoom invitation tests group`, (group) => {
    const {
        createUserAndGetSocket,
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

    test('It should find on user join the related mpeRoom Invitation and compute userHasBeenInvited', async (assert) => {
        const invitedUserID = datatype.uuid();
        const creatorUserID = datatype.uuid();
        const roomID = datatype.uuid();
        const creatorSocket = await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [
                {
                    roomID,
                },
            ],
        });
        const invitedUserSocket = await createUserAndGetSocket({
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

        let mockHasBeenCalled = false;
        sinon
            .stub(MpeServerToTemporalController, 'joinWorkflow')
            .callsFake(async ({ userHasBeenInvited }) => {
                assert.isTrue(userHasBeenInvited);
                mockHasBeenCalled = true;

                return {
                    ok: 1,
                };
            });

        invitedUserSocket.emit('MPE_JOIN_ROOM', {
            roomID,
        });

        await waitFor(async () => {
            assert.isTrue(mockHasBeenCalled);
        });
    });
});
