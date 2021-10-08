import Database from '@ioc:Adonis/Lucid/Database';
import { datatype, random } from 'faker';
import test from 'japa';
import { initTestUtils, waitForTimeout } from './utils/TestUtils';

test.group('MtvRoom Chat', (group) => {
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
        await Database.rollbackGlobalTransaction();
    });

    test('Sent message is received by users in room', async (assert) => {
        const senderUserID = datatype.uuid();
        const receiverUserID = datatype.uuid();
        const mtvRoomID = datatype.uuid();

        const senderSocket = await createUserAndGetSocket({
            userID: senderUserID,
            mtvRoomIDToAssociate: mtvRoomID,
        });
        const receiverSocket = await createUserAndGetSocket({
            userID: receiverUserID,
            mtvRoomIDToAssociate: mtvRoomID,
        });

        let messageHasBeenReceivedByReceiver = false;

        receiverSocket.on('RECEIVED_MESSAGE', () => {
            messageHasBeenReceivedByReceiver = true;
        });

        senderSocket.emit('NEW_MESSAGE', {
            message: random.words(),
        });

        await waitFor(() => {
            assert.isTrue(messageHasBeenReceivedByReceiver);
        });
    });

    test('Sent message is not received by sender', async (assert) => {
        const senderUserID = datatype.uuid();
        const mtvRoomID = datatype.uuid();

        const senderSocket = await createUserAndGetSocket({
            userID: senderUserID,
            mtvRoomIDToAssociate: mtvRoomID,
        });

        let messageHasBeenReceivedByEmitter = false;

        senderSocket.on('RECEIVED_MESSAGE', () => {
            messageHasBeenReceivedByEmitter = true;
        });

        senderSocket.emit('NEW_MESSAGE', {
            message: random.words(),
        });

        await waitForTimeout(200);

        assert.isFalse(messageHasBeenReceivedByEmitter);
    });
});
