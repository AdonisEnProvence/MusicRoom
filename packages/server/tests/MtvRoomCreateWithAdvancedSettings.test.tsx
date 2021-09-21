import Database from '@ioc:Adonis/Lucid/Database';
import { MtvRoomClientToServerCreateArgs } from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { initTestUtils, sleep } from './utils/TestUtils';

test.group(`MtvRoom create room with advanced settings`, (group) => {
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

    test('It should fail to create mtv room with corrupted settings', async (assert) => {
        const userID = datatype.uuid();

        const socket = await createUserAndGetSocket({
            userID,
        });

        const settingsList: MtvRoomClientToServerCreateArgs[] = [
            {
                hasPhysicalAndTimeConstraints: true,
                physicalAndTimeConstraints: undefined,
                initialTracksIDs: [],
                isOpen: false,
                isOpenOnlyInvitedUsersCanVote: false,
                name: random.word(),
                minimumScoreToBePlayed: 1,
                playingMode: 'BROADCAST',
            },
            {
                hasPhysicalAndTimeConstraints: false,
                physicalAndTimeConstraints: {
                    physicalConstraintEndsAt: datatype
                        .datetime()
                        .toDateString(),
                    physicalConstraintStartsAt: datatype
                        .datetime()
                        .toDateString(),
                    physicalConstraintPlaceID: random.words(4),
                    physicalConstraintRadius: datatype.number(),
                },
                initialTracksIDs: [],
                isOpen: false,
                isOpenOnlyInvitedUsersCanVote: false,
                name: random.word(),
                minimumScoreToBePlayed: 1,
                playingMode: 'BROADCAST',
            },
            {
                hasPhysicalAndTimeConstraints: true,
                physicalAndTimeConstraints: undefined,
                initialTracksIDs: [],
                isOpen: false,
                isOpenOnlyInvitedUsersCanVote: true,
                name: random.word(),
                minimumScoreToBePlayed: 1,
                playingMode: 'BROADCAST',
            },
        ];

        settingsList.forEach((settings) =>
            socket.emit('CREATE_ROOM', settings),
        );
        await sleep();

        const roomCreationFailed = (await MtvRoom.all()).length === 0;
        assert.isTrue(roomCreationFailed);
    });
});
