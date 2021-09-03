import Database from '@ioc:Adonis/Lucid/Database';
import { MtvWorkflowState, UserRelatedInformation } from '@musicroom/types';
import ServerToTemporalController from 'App/Controllers/Http/Temporal/ServerToTemporalController';
import Device from 'App/Models/Device';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import { BASE_URL, initTestUtils, sleep } from './utils/TestUtils';

test.group(
    `User change emitting device success and fail cases & eviction handler`,
    (group) => {
        const {
            createSocketConnection,
            createUserAndGetSocket,
            disconnectEveryRemainingSocketConnection,
            disconnectSocket,
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

        test(`It should change user emitting device,
    After a socket disconnection, it should automatically assign a new emitting device`, async (assert) => {
            const userID = datatype.uuid();

            sinon
                .stub(ServerToTemporalController, 'changeUserEmittingDevice')
                .callsFake(async ({ deviceID, workflowID }) => {
                    const state: MtvWorkflowState = {
                        currentTrack: null,
                        name: random.word(),
                        playing: false,
                        roomCreatorUserID: userID,
                        roomID: workflowID,
                        tracks: null,
                        userRelatedInformation: {
                            userID: userID,
                            emittingDeviceID: deviceID,
                            tracksVotedFor: [],
                        },
                        minimumScoreToBePlayed: 0,
                        usersLength: 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/change-user-emitting-device')
                        .send(state);
                    return;
                });

            /**
             * Mocking a mtvRoom in the databse
             */

            const mtvRoomIDToAssociate = datatype.uuid();
            const socket = {
                socket: await createUserAndGetSocket({
                    userID,
                    mtvRoomIDToAssociate,
                }),
                receivedEvents: [] as string[],
            };

            const deviceA = await Device.findBy('socket_id', socket.socket.id);
            assert.isNotNull(deviceA);
            if (deviceA === null) {
                throw new Error('device should not be null');
            }
            deviceA.isEmitting = true;
            await deviceA.save();

            const socketB = {
                socket: await createSocketConnection({ userID }),
                receivedEvents: [] as string[],
            };

            const deviceB = await Device.findBy('socket_id', socketB.socket.id);
            assert.isNotNull(deviceB);
            if (deviceB === null) {
                throw new Error('device should not be null');
            }

            socketB.socket.once(
                'CHANGE_EMITTING_DEVICE_CALLBACK',
                ({ userRelatedInformation }) => {
                    const expectedUserRelatedInformation: UserRelatedInformation | null =
                        {
                            userID: userID,
                            emittingDeviceID: deviceB.uuid,
                            tracksVotedFor: [],
                        };

                    assert.isNotNull(userRelatedInformation);
                    if (userRelatedInformation === null)
                        throw new Error(
                            'UserRelatedInformation should not be null there',
                        );

                    assert.deepEqual(
                        userRelatedInformation,
                        expectedUserRelatedInformation,
                    );
                    socketB.receivedEvents.push(
                        'CHANGE_EMITTING_DEVICE_CALLBACK',
                    );
                },
            );

            socket.socket.once(
                'CHANGE_EMITTING_DEVICE_CALLBACK',
                ({ userRelatedInformation }) => {
                    const expectedUserRelatedInformation: UserRelatedInformation =
                        {
                            userID: userID,
                            emittingDeviceID: deviceB.uuid,
                            tracksVotedFor: [],
                        };

                    assert.deepEqual(
                        userRelatedInformation,
                        expectedUserRelatedInformation,
                    );
                    socket.receivedEvents.push(
                        'CHANGE_EMITTING_DEVICE_CALLBACK',
                    );
                },
            );

            socket.socket.emit('CHANGE_EMITTING_DEVICE', {
                newEmittingDeviceID: deviceB.uuid,
            });
            await sleep();

            await deviceA.refresh();
            await deviceB.refresh();

            assert.equal(deviceA.isEmitting, false);
            assert.equal(deviceB.isEmitting, true);
            assert.equal(socketB.receivedEvents.length, 1);
            assert.equal(socket.receivedEvents.length, 1);

            //Test emitting device eviction auto switch
            let receivedChangeEmittingDeviceThroughEviction = false;

            socket.socket.once(
                'CHANGE_EMITTING_DEVICE_CALLBACK',
                ({ userRelatedInformation }) => {
                    assert.isNotNull(userRelatedInformation);
                    if (userRelatedInformation === null)
                        throw new Error('userRelatedInformations is null');
                    assert.equal(
                        userRelatedInformation.emittingDeviceID,
                        deviceA.uuid,
                    );
                    receivedChangeEmittingDeviceThroughEviction = true;
                },
            );

            await disconnectSocket(socketB.socket);
            await sleep();

            assert.isTrue(receivedChangeEmittingDeviceThroughEviction);
            await deviceA.refresh();
            assert.isTrue(deviceA.isEmitting);
        });

        test(`It should fail change user emitting device as user is not in a mtvRoom`, async (assert) => {
            const userID = datatype.uuid();
            sinon
                .stub(ServerToTemporalController, 'changeUserEmittingDevice')
                .callsFake(async ({ deviceID, workflowID }) => {
                    console.log('SALUT JE SUIS LE MOCK');
                    const state: MtvWorkflowState = {
                        currentTrack: null,
                        name: random.word(),
                        playing: false,
                        roomCreatorUserID: userID,
                        roomID: workflowID,
                        tracks: null,
                        userRelatedInformation: {
                            userID: userID,
                            emittingDeviceID: deviceID,
                            tracksVotedFor: [],
                        },
                        minimumScoreToBePlayed: 0,
                        usersLength: 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/change-user-emitting-device')
                        .send(state);
                    return;
                });

            const socket = {
                socket: await createUserAndGetSocket({ userID }),
                receivedEvents: [] as string[],
            };
            const socketB = {
                socket: await createSocketConnection({ userID }),
                receivedEvents: [] as string[],
            };
            const deviceB = await Device.findBy('socket_id', socketB.socket.id);

            assert.isNotNull(deviceB);
            if (deviceB === null) {
                throw new Error('device should not be null');
            }

            let hasNeverBeenCalled = true;

            socketB.socket.once('CHANGE_EMITTING_DEVICE_CALLBACK', () => {
                assert.isTrue(false);
                hasNeverBeenCalled = false;
            });

            socket.socket.once('CHANGE_EMITTING_DEVICE_CALLBACK', () => {
                assert.isTrue(false);
                hasNeverBeenCalled = false;
            });

            socket.socket.emit('CHANGE_EMITTING_DEVICE', {
                newEmittingDeviceID: deviceB.uuid,
            });
            await sleep();

            assert.isTrue(hasNeverBeenCalled);
        });

        test('It should fail change user emitting device as user is not the newEmittingDevice owner', async (assert) => {
            const userID = datatype.uuid();
            const secondUserID = datatype.uuid();

            sinon
                .stub(ServerToTemporalController, 'changeUserEmittingDevice')
                .callsFake(async ({ deviceID, workflowID }) => {
                    const state: MtvWorkflowState = {
                        currentTrack: null,
                        name: random.word(),
                        playing: false,
                        roomCreatorUserID: userID,
                        roomID: workflowID,
                        tracks: null,
                        userRelatedInformation: {
                            userID: userID,
                            emittingDeviceID: deviceID,
                            tracksVotedFor: [],
                        },
                        minimumScoreToBePlayed: 0,
                        usersLength: 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/change-user-emitting-device')
                        .send(state);
                    return;
                });

            const socket = {
                socket: await createUserAndGetSocket({ userID }),
                receivedEvents: [] as string[],
            };
            const socketB = {
                socket: await createUserAndGetSocket({
                    userID: secondUserID,
                }),
                receivedEvents: [] as string[],
            };
            const deviceB = await Device.findBy('socket_id', socketB.socket.id);

            assert.isNotNull(deviceB);
            if (deviceB === null) {
                throw new Error('device should not be null');
            }

            let hasNeverBeenCalled = true;

            socketB.socket.once('CHANGE_EMITTING_DEVICE_CALLBACK', () => {
                hasNeverBeenCalled = false;
            });

            socket.socket.once('CHANGE_EMITTING_DEVICE_CALLBACK', () => {
                hasNeverBeenCalled = false;
            });

            socket.socket.emit('CHANGE_EMITTING_DEVICE', {
                newEmittingDeviceID: deviceB.uuid,
            });
            await sleep();

            assert.isTrue(hasNeverBeenCalled);
        });
    },
);
