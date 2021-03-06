import Database from '@ioc:Adonis/Lucid/Database';
import { MtvWorkflowState } from '@musicroom/types';
import Device from 'App/Models/Device';
import User from 'App/Models/User';
import UserService from 'App/Services/UserService';
import { datatype, random, internet } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { initTestUtils, sleep } from './utils/TestUtils';

test.group(`User service socket handler tests`, (group) => {
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

    test('It should send server socket event to the client via the UserService.emitEventInSocket', async (assert) => {
        const userID = datatype.uuid();
        const socket = await createAuthenticatedUserAndGetSocket({ userID });
        const state: MtvWorkflowState = {
            currentTrack: null,
            playingMode: 'BROADCAST',
            name: random.word(),
            playing: false,
            delegationOwnerUserID: null,
            isOpen: true,
            isOpenOnlyInvitedUsersCanVote: false,
            roomCreatorUserID: userID,
            roomID: datatype.uuid(),
            tracks: null,
            usersLength: 1,
            userRelatedInformation: null,
            minimumScoreToBePlayed: 1,
            hasTimeAndPositionConstraints: false,
            timeConstraintIsValid: null,
        };
        const receivedEvents: string[] = [];

        socket.once('MTV_CREATE_ROOM_CALLBACK', (payload) => {
            assert.deepEqual(payload, state);
            receivedEvents.push('MTV_CREATE_ROOM_CALLBACK');
        });

        UserService.emitEventInSocket(socket.id, 'MTV_CREATE_ROOM_CALLBACK', [
            state,
        ]);

        await sleep();
        assert.isTrue(receivedEvents.includes('MTV_CREATE_ROOM_CALLBACK'));
    });

    test('It throw an error as no user device could join socket room', async (assert) => {
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: random.word(),
            email: internet.email(),
            password: internet.password(),
        });
        const roomID = datatype.uuid();

        const devices = await Device.createMany([
            {
                userID: userID,
                uuid: datatype.uuid(),
                socketID: datatype.uuid(),
                name: random.word(),
            },
            {
                userID: userID,
                uuid: datatype.uuid(),
                socketID: datatype.uuid(),
                name: random.word(),
            },
        ]);

        user.related('devices').saveMany(devices);

        try {
            await UserService.joinEveryUserDevicesToRoom(user, roomID);
        } catch ({ message }) {
            assert.equal(
                message,
                `couldn't join for any device for user ${user.uuid}`,
            );
        }
    }).timeout(10_000);
});
