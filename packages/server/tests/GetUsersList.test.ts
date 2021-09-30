import Database from '@ioc:Adonis/Lucid/Database';
import { MtvRoomUsersListRawElementFromTemporal } from '@musicroom/types';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import { datatype } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { initTestUtils, sleep } from './utils/TestUtils';

test.group(`MtvRoom get users list test group`, (group) => {
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

    test('It should return users list with avatar and nickame', async (assert) => {
        const userID = datatype.uuid();
        const roomID = datatype.uuid();
        const socket = await createUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate: roomID,
        });

        sinon
            .stub(ServerToTemporalController, 'getUsersList')
            .callsFake(
                async (): Promise<MtvRoomUsersListRawElementFromTemporal[]> => {
                    const usersList: MtvRoomUsersListRawElementFromTemporal[] =
                        [
                            {
                                hasControlAndDelegationPermission: true,
                                isCreator: true,
                                isDelegationOwner: false,
                                userID: userID,
                            },
                        ];
                    return usersList;
                },
            );

        let callbakcHasBeenCalled = false;
        socket.emit('GET_USERS_LIST', (usersList) => {
            callbakcHasBeenCalled = true;
            assert.equal(1, usersList.length);
            const creator = usersList.find((user) => user.userID === userID);
            assert.isNotNull(creator);
            assert.isNotNull(creator?.nickname);
        });

        await sleep();
        assert.isTrue(callbakcHasBeenCalled);
    });

    test('It should throw error as temporal mocked response is not sync to adonis database', async (assert) => {
        const userID = datatype.uuid();
        const roomID = datatype.uuid();

        await createUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate: roomID,
        });

        sinon
            .stub(ServerToTemporalController, 'getUsersList')
            .callsFake(
                async (): Promise<MtvRoomUsersListRawElementFromTemporal[]> => {
                    const usersList: MtvRoomUsersListRawElementFromTemporal[] =
                        [
                            {
                                hasControlAndDelegationPermission: true,
                                isCreator: true,
                                isDelegationOwner: false,
                                userID: datatype.uuid(),
                            },
                        ];
                    return usersList;
                },
            );

        try {
            await MtvRoomsWsController.onGetUsersList({ roomID, userID });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal(
                message,
                'Postgres and temporal are desync on users list',
            );
        }
    });

    test('It should throw error as temporal mocked response is not sync to adonis database', async (assert) => {
        const userID = datatype.uuid();
        const roomID = datatype.uuid();

        await createUserAndGetSocket({
            userID,
            mtvRoomIDToAssociate: roomID,
        });

        sinon
            .stub(ServerToTemporalController, 'getUsersList')
            .callsFake(
                async (): Promise<MtvRoomUsersListRawElementFromTemporal[]> => {
                    const usersList: MtvRoomUsersListRawElementFromTemporal[] =
                        [];
                    return usersList;
                },
            );

        try {
            await MtvRoomsWsController.onGetUsersList({ roomID, userID });
            assert.isTrue(false);
        } catch ({ message }) {
            assert.equal(message, 'FormattedUsersList is empty');
        }
    });
});
