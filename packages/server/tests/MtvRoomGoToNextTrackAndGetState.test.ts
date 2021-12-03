import Database from '@ioc:Adonis/Lucid/Database';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import MtvRoom from '../app/Models/MtvRoom';
import { initTestUtils, sleep } from './utils/TestUtils';

test.group(
    `MtvRoom basic related signal
    GetState join create goToNextTrack play pause etc`,
    (group) => {
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

        test('Go to next tracks events are forwarded to Temporal', async (assert) => {
            /**
             * Create a user that is member of a mtv room.
             * We want this user to send a MTV_GO_TO_NEXT_TRACK event and assert
             * that the method that forwards the event is correctly called.
             */
            const userID = datatype.uuid();

            const mtvRoomIDToAssociate = datatype.uuid();
            const socket = await createUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate,
            });

            const goToNextTrackStub = sinon
                .stub(MtvServerToTemporalController, 'goToNextTrack')
                .resolves();

            socket.emit('MTV_GO_TO_NEXT_TRACK');

            await sleep();

            assert.isTrue(goToNextTrackStub.calledOnce);
        });

        test('It should send back the socket related mtv room context', async (assert) => {
            /**
             * Manually create and associate room to user and socket to user
             * Then emit a MTV_GET_CONTEXT and verify that the test achieves to it
             */
            const userID = datatype.uuid();
            const mtvRoomIDToAssociate = datatype.uuid();
            const socket = await createUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate,
            });
            assert.equal(1, (await MtvRoom.all()).length);
            const receivedEvents: string[] = [];

            socket.once('MTV_RETRIEVE_CONTEXT', () => {
                receivedEvents.push('MTV_RETRIEVE_CONTEXT');
            });

            sinon
                .stub(MtvServerToTemporalController, 'getState')
                .callsFake(async () => {
                    return {
                        roomID: mtvRoomIDToAssociate,
                        currentTrack: null,
                        playingMode: 'BROADCAST',
                        name: random.word(),
                        playing: false,
                        isOpen: true,
                        isOpenOnlyInvitedUsersCanVote: false,
                        hasTimeAndPositionConstraints: false,
                        timeConstraintIsValid: null,
                        roomCreatorUserID: userID,
                        tracks: null,
                        userRelatedInformation: null,
                        minimumScoreToBePlayed: 1,
                        usersLength: 1,
                        delegationOwnerUserID: null,
                    };
                });

            socket.emit('MTV_GET_CONTEXT');

            await sleep();

            assert.equal(receivedEvents[0], 'MTV_RETRIEVE_CONTEXT');
        });
    },
);
