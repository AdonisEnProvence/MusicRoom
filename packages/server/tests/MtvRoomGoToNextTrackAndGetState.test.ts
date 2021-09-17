import Database from '@ioc:Adonis/Lucid/Database';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
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
             * We want this user to send a GO_TO_NEXT_TRACK event and assert
             * that the method that forwards the event is correctly called.
             */
            const userID = datatype.uuid();

            const mtvRoomIDToAssociate = datatype.uuid();
            const socket = await createUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate,
            });

            const goToNextTrackStub = sinon
                .stub(ServerToTemporalController, 'goToNextTrack')
                .resolves();

            socket.emit('GO_TO_NEXT_TRACK');

            await sleep();

            assert.isTrue(goToNextTrackStub.calledOnce);
        });

        test('It should send back the socket related mtv room context', async (assert) => {
            /**
             * Manually create and associate room to user and socket to user
             * Then emit a GET_CONTEXT and verify that the test achieves to it
             */
            const userID = datatype.uuid();
            const mtvRoomIDToAssociate = datatype.uuid();
            const socket = await createUserAndGetSocket({
                userID,
                mtvRoomIDToAssociate,
            });
            assert.equal(1, (await MtvRoom.all()).length);
            const receivedEvents: string[] = [];

            socket.once('RETRIEVE_CONTEXT', () => {
                receivedEvents.push('RETRIEVE_CONTEXT');
            });

            sinon
                .stub(ServerToTemporalController, 'getState')
                .callsFake(async () => {
                    return {
                        roomID: mtvRoomIDToAssociate,
                        currentTrack: null,
                        mode: 'BROADCAST',
                        name: random.word(),
                        playing: false,
                        roomHasTimeAndPositionConstraints: false,
                        timeConstraintIsValid: null,
                        roomCreatorUserID: userID,
                        tracks: null,
                        userRelatedInformation: null,
                        minimumScoreToBePlayed: 1,
                        usersLength: 1,
                    };
                });

            socket.emit('GET_CONTEXT');

            await sleep();

            assert.equal(receivedEvents[0], 'RETRIEVE_CONTEXT');
        });
    },
);
