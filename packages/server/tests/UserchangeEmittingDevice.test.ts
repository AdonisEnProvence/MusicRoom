import Database from '@ioc:Adonis/Lucid/Database';
import {
    MtvPlayingModes,
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
    UserRelatedInformation,
} from '@musicroom/types';
import MtvServerToTemporalController from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import Device from 'App/Models/Device';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import {
    BASE_URL,
    getDefaultMtvRoomCreateRoomArgs,
    getSocketApiAuthToken,
    initTestUtils,
    sleep,
} from './utils/TestUtils';

test.group(
    `User change emitting device success and fail cases & eviction handler`,
    (group) => {
        const {
            createSocketConnection,
            createAuthenticatedUserAndGetSocket,
            disconnectEveryRemainingSocketConnection,
            disconnectSocket,
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

        test(`It should change user emitting device,
    After a socket disconnection, it should automatically assign a new emitting device`, async (assert) => {
            const userID = datatype.uuid();

            sinon
                .stub(MtvServerToTemporalController, 'changeUserEmittingDevice')
                .callsFake(async ({ deviceID, workflowID }) => {
                    const state: MtvWorkflowState = {
                        currentTrack: null,
                        name: random.word(),
                        delegationOwnerUserID: null,
                        playing: false,
                        roomCreatorUserID: userID,
                        roomID: workflowID,
                        tracks: null,
                        hasTimeAndPositionConstraints: false,
                        isOpen: true,
                        isOpenOnlyInvitedUsersCanVote: false,
                        timeConstraintIsValid: null,
                        playingMode: 'BROADCAST',
                        userRelatedInformation: {
                            hasControlAndDelegationPermission: true,
                            userFitsPositionConstraint: null,
                            userHasBeenInvited: false,
                            userID: userID,
                            emittingDeviceID: deviceID,
                            tracksVotedFor: [],
                        },
                        minimumScoreToBePlayed: 1,
                        usersLength: 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/mtv/change-user-emitting-device')
                        .send(state);
                    return;
                });

            /**
             * Mocking a mtvRoom in the databse
             */

            const mtvRoomIDToAssociate = datatype.uuid();
            const socket = {
                socket: await createAuthenticatedUserAndGetSocket({
                    userID,
                    mtvRoomIDToAssociate,
                }),
                receivedEvents: [] as string[],
            };
            const token = getSocketApiAuthToken(socket.socket);

            const deviceA = await Device.findBy('socket_id', socket.socket.id);
            assert.isNotNull(deviceA);
            if (deviceA === null) {
                throw new Error('device should not be null');
            }
            deviceA.isEmitting = true;
            await deviceA.save();

            const socketB = {
                socket: await createSocketConnection({ userID, token }),
                receivedEvents: [] as string[],
            };

            const deviceB = await Device.findBy('socket_id', socketB.socket.id);
            assert.isNotNull(deviceB);
            if (deviceB === null) {
                throw new Error('device should not be null');
            }

            socketB.socket.once(
                'MTV_CHANGE_EMITTING_DEVICE_CALLBACK',
                ({ userRelatedInformation }) => {
                    const expectedUserRelatedInformation: UserRelatedInformation | null =
                        {
                            userFitsPositionConstraint: null,
                            hasControlAndDelegationPermission: true,
                            userHasBeenInvited: false,
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
                        'MTV_CHANGE_EMITTING_DEVICE_CALLBACK',
                    );
                },
            );

            socket.socket.once(
                'MTV_CHANGE_EMITTING_DEVICE_CALLBACK',
                ({ userRelatedInformation }) => {
                    const expectedUserRelatedInformation: UserRelatedInformation =
                        {
                            userFitsPositionConstraint: null,
                            hasControlAndDelegationPermission: true,
                            userHasBeenInvited: false,
                            userID: userID,
                            emittingDeviceID: deviceB.uuid,
                            tracksVotedFor: [],
                        };

                    assert.deepEqual(
                        userRelatedInformation,
                        expectedUserRelatedInformation,
                    );
                    socket.receivedEvents.push(
                        'MTV_CHANGE_EMITTING_DEVICE_CALLBACK',
                    );
                },
            );

            socket.socket.emit('MTV_CHANGE_EMITTING_DEVICE', {
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
                'MTV_CHANGE_EMITTING_DEVICE_CALLBACK',
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
                .stub(MtvServerToTemporalController, 'changeUserEmittingDevice')
                .callsFake(async ({ deviceID, workflowID }) => {
                    const state: MtvWorkflowState = {
                        currentTrack: null,
                        name: random.word(),
                        playing: false,
                        roomCreatorUserID: userID,
                        roomID: workflowID,
                        delegationOwnerUserID: null,
                        tracks: null,
                        playingMode: 'BROADCAST',
                        isOpen: true,
                        isOpenOnlyInvitedUsersCanVote: false,
                        hasTimeAndPositionConstraints: false,
                        timeConstraintIsValid: null,
                        userRelatedInformation: {
                            userFitsPositionConstraint: null,
                            hasControlAndDelegationPermission: true,
                            userHasBeenInvited: false,
                            userID: userID,
                            emittingDeviceID: deviceID,
                            tracksVotedFor: [],
                        },
                        minimumScoreToBePlayed: 1,
                        usersLength: 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/mtv/change-user-emitting-device')
                        .send(state);
                    return;
                });

            const socket = {
                socket: await createAuthenticatedUserAndGetSocket({ userID }),
                receivedEvents: [] as string[],
            };
            const token = getSocketApiAuthToken(socket.socket);

            const socketB = {
                socket: await createSocketConnection({ userID, token }),
                receivedEvents: [] as string[],
            };
            const deviceB = await Device.findBy('socket_id', socketB.socket.id);

            assert.isNotNull(deviceB);
            if (deviceB === null) {
                throw new Error('device should not be null');
            }

            let hasNeverBeenCalled = true;

            socketB.socket.once('MTV_CHANGE_EMITTING_DEVICE_CALLBACK', () => {
                assert.isTrue(false);
                hasNeverBeenCalled = false;
            });

            socket.socket.once('MTV_CHANGE_EMITTING_DEVICE_CALLBACK', () => {
                assert.isTrue(false);
                hasNeverBeenCalled = false;
            });

            socket.socket.emit('MTV_CHANGE_EMITTING_DEVICE', {
                newEmittingDeviceID: deviceB.uuid,
            });
            await sleep();

            assert.isTrue(hasNeverBeenCalled);
        });

        test('It should fail change user emitting device as user is not the newEmittingDevice owner', async (assert) => {
            const userID = datatype.uuid();
            const secondUserID = datatype.uuid();

            sinon
                .stub(MtvServerToTemporalController, 'changeUserEmittingDevice')
                .callsFake(async ({ deviceID, workflowID }) => {
                    const state: MtvWorkflowState = {
                        currentTrack: null,
                        name: random.word(),
                        playing: false,
                        roomCreatorUserID: userID,
                        roomID: workflowID,
                        tracks: null,
                        playingMode: 'BROADCAST',
                        isOpen: true,
                        isOpenOnlyInvitedUsersCanVote: false,
                        hasTimeAndPositionConstraints: false,
                        timeConstraintIsValid: null,
                        delegationOwnerUserID: null,
                        userRelatedInformation: {
                            userFitsPositionConstraint: null,
                            hasControlAndDelegationPermission: true,
                            userHasBeenInvited: false,
                            userID: userID,
                            emittingDeviceID: deviceID,
                            tracksVotedFor: [],
                        },
                        minimumScoreToBePlayed: 1,
                        usersLength: 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/mtv/change-user-emitting-device')
                        .send(state);
                    return;
                });

            const socket = {
                socket: await createAuthenticatedUserAndGetSocket({ userID }),
                receivedEvents: [] as string[],
            };
            const socketB = {
                socket: await createAuthenticatedUserAndGetSocket({
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

            socketB.socket.once('MTV_CHANGE_EMITTING_DEVICE_CALLBACK', () => {
                hasNeverBeenCalled = false;
            });

            socket.socket.once('MTV_CHANGE_EMITTING_DEVICE_CALLBACK', () => {
                hasNeverBeenCalled = false;
            });

            socket.socket.emit('MTV_CHANGE_EMITTING_DEVICE', {
                newEmittingDeviceID: deviceB.uuid,
            });
            await sleep();

            assert.isTrue(hasNeverBeenCalled);
        });

        test('After user creates a room emitting device should be updated in database', async (assert) => {
            const creatorUserID = datatype.uuid();

            /** Mocks */
            sinon
                .stub(MtvServerToTemporalController, 'createMtvWorkflow')
                .callsFake(async ({ workflowID, userID, deviceID }) => {
                    const state: MtvWorkflowStateWithUserRelatedInformation = {
                        currentTrack: null,
                        roomID: workflowID,
                        roomCreatorUserID: userID,
                        hasTimeAndPositionConstraints: false,
                        isOpen: true,
                        delegationOwnerUserID: null,

                        isOpenOnlyInvitedUsersCanVote: false,
                        timeConstraintIsValid: null,
                        playingMode: MtvPlayingModes.Values.BROADCAST,
                        tracks: null,
                        playing: false,
                        name: random.word(),
                        userRelatedInformation: {
                            hasControlAndDelegationPermission: true,
                            userID,
                            emittingDeviceID: deviceID,
                            tracksVotedFor: [],
                            userHasBeenInvited: false,
                            userFitsPositionConstraint: null,
                        },
                        minimumScoreToBePlayed: 1,
                        usersLength: 1,
                    };

                    await supertest(BASE_URL)
                        .post('/temporal/mtv/mtv-creation-acknowledgement')
                        .send(state);

                    return {
                        runID: datatype.uuid(),
                        workflowID: workflowID,
                        state,
                    };
                });
            /** ***** */

            const socket = await createAuthenticatedUserAndGetSocket({
                userID: creatorUserID,
            });

            let callbackHasBeenCalled = false;
            const device = await Device.findBy('socket_id', socket.id);
            assert.isNotNull(device);
            if (device === null) {
                throw new Error('device is null');
            }
            assert.isFalse(device.isEmitting);

            socket.on('MTV_CREATE_ROOM_CALLBACK', () => {
                callbackHasBeenCalled = true;
            });

            const settings = getDefaultMtvRoomCreateRoomArgs();
            socket.emit('MTV_CREATE_ROOM', {
                ...settings,
            });

            await waitFor(async () => {
                assert.isTrue(callbackHasBeenCalled);
                await device.refresh();
                assert.isTrue(device.isEmitting);
            });
        });

        test('After user joins a room emitting device should be updated in database', async (assert) => {
            const creatorUserID = datatype.uuid();
            const joiningUserID = datatype.uuid();
            const mtvRoomIDToAssociate = datatype.uuid();

            /** Mocks */
            sinon
                .stub(MtvServerToTemporalController, 'joinWorkflow')
                .callsFake(async ({ workflowID, userID, deviceID }) => {
                    const state: MtvWorkflowStateWithUserRelatedInformation = {
                        currentTrack: null,
                        roomID: workflowID,
                        roomCreatorUserID: userID,
                        hasTimeAndPositionConstraints: false,
                        isOpen: true,
                        delegationOwnerUserID: null,

                        isOpenOnlyInvitedUsersCanVote: false,
                        timeConstraintIsValid: null,
                        playingMode: MtvPlayingModes.Values.BROADCAST,
                        tracks: null,
                        playing: false,
                        name: random.word(),
                        userRelatedInformation: {
                            hasControlAndDelegationPermission: true,
                            userID,
                            emittingDeviceID: deviceID,
                            tracksVotedFor: [],
                            userHasBeenInvited: false,
                            userFitsPositionConstraint: null,
                        },
                        minimumScoreToBePlayed: 1,
                        usersLength: 1,
                    };
                    await supertest(BASE_URL)
                        .post('/temporal/mtv/join')
                        .send({ state, joiningUserID: userID });
                    return;
                });

            /** ***** */

            await createAuthenticatedUserAndGetSocket({
                userID: creatorUserID,
                mtvRoomIDToAssociate,
            });

            let callbackHasBeenCalled = false;
            const joiningUserSocket = await createAuthenticatedUserAndGetSocket(
                {
                    userID: joiningUserID,
                },
            );

            const joiningUserDevice = await Device.findBy(
                'socket_id',
                joiningUserSocket.id,
            );
            assert.isNotNull(joiningUserDevice);
            if (joiningUserDevice === null) {
                throw new Error('device is null');
            }
            assert.isFalse(joiningUserDevice.isEmitting);

            joiningUserSocket.on('MTV_JOIN_ROOM_CALLBACK', () => {
                callbackHasBeenCalled = true;
            });

            joiningUserSocket.emit('MTV_JOIN_ROOM', {
                roomID: mtvRoomIDToAssociate,
            });

            await waitFor(async () => {
                assert.isTrue(callbackHasBeenCalled);
                await joiningUserDevice.refresh();
                assert.isTrue(joiningUserDevice.isEmitting);
            });
        });
    },
);
