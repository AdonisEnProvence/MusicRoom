import Database from '@ioc:Adonis/Lucid/Database';
import MpeServerToTemporalController from 'App/Controllers/Http/Temporal/MpeServerToTemporalController';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import {
    initTestUtils,
    createSpyOnClientSocketEvent,
    generateArray,
    generateMpeWorkflowStateWithUserRelatedInformation,
} from './utils/TestUtils';

test.group('MPE get context', (group) => {
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

    test('It should retrieve context from an already joined room', async (assert) => {
        const creatorUserID = datatype.uuid();
        const roomsIDs = generateArray({
            fill: () => {
                return {
                    roomID: datatype.uuid(),
                    roomName: random.words(3),
                };
            },
            minLength: 3,
            maxLength: 7,
        });
        const { roomID } = roomsIDs[0];
        const socket = await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: roomsIDs,
        });

        const state = generateMpeWorkflowStateWithUserRelatedInformation({
            overrides: {
                roomID,
                roomCreatorUserID: creatorUserID,
            },
            userID: creatorUserID,
        });

        sinon
            .stub(MpeServerToTemporalController, 'getStateQuery')
            .callsFake(async ({ workflowID }) => {
                assert.equal(roomID, workflowID);

                return {
                    state,
                    workflowID: state.roomID,
                };
            });

        const getMpeContextSuccessSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_SUCCESS_CALLBACK',
        );

        const getMpeContextFailSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_FAIL_CALLBACK',
        );

        socket.emit('MPE_GET_CONTEXT', {
            roomID,
        });

        await waitFor(() => {
            assert.isTrue(
                getMpeContextSuccessSpy.calledOnceWithExactly({
                    userIsNotInRoom: false,
                    roomID,
                    state,
                }),
            );
            assert.isTrue(getMpeContextFailSpy.notCalled);
        });
    });

    test('It should retrieve context from a not already joined room', async (assert) => {
        const roomID = datatype.uuid();

        //room we want to retrieve context from
        const creatorUserID = datatype.uuid();
        const room = {
            roomID,
            roomName: random.words(3),
        };
        await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [room],
        });
        ///

        //User retrieving room context
        const roomsIDs = generateArray({
            fill: () => {
                return {
                    roomID: datatype.uuid(),
                    roomName: random.words(3),
                };
            },
            minLength: 3,
            maxLength: 7,
        });
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: roomsIDs,
        });
        ///

        const state = generateMpeWorkflowStateWithUserRelatedInformation({
            overrides: {
                roomID,
                roomCreatorUserID: creatorUserID,
            },
            userID,
        });

        sinon
            .stub(MpeServerToTemporalController, 'getStateQuery')
            .callsFake(async ({ workflowID }) => {
                assert.equal(roomID, workflowID);

                return {
                    state,
                    workflowID: state.roomID,
                };
            });

        const getMpeContextSuccessSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_SUCCESS_CALLBACK',
        );

        const getMpeContextFailSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_FAIL_CALLBACK',
        );

        socket.emit('MPE_GET_CONTEXT', {
            roomID,
        });

        await waitFor(() => {
            assert.isTrue(
                getMpeContextSuccessSpy.calledOnceWithExactly({
                    userIsNotInRoom: true,
                    roomID,
                    state,
                }),
            );
            assert.isTrue(getMpeContextFailSpy.notCalled);
        });
    });

    test('It should fail to retrieve context from not existing room', async (assert) => {
        const notExistingRoomID = datatype.uuid();

        //User retrieving room context
        const roomsIDs = Array.from({
            length: datatype.number({ min: 3, max: 7 }),
        }).map(() => ({
            roomID: datatype.uuid(),
            roomName: random.words(3),
        }));
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: roomsIDs,
        });
        ///

        sinon
            .stub(MpeServerToTemporalController, 'getStateQuery')
            .callsFake(async () => {
                assert.isTrue(false);

                throw new Error('Should never occurs');
            });

        const getMpeContextSuccessSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_SUCCESS_CALLBACK',
        );

        const getMpeContextFailSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_FAIL_CALLBACK',
        );

        socket.emit('MPE_GET_CONTEXT', {
            roomID: notExistingRoomID,
        });

        await waitFor(() => {
            assert.isTrue(
                getMpeContextFailSpy.calledOnceWithExactly({
                    roomID: notExistingRoomID,
                }),
            );
            assert.isTrue(getMpeContextSuccessSpy.notCalled);
        });
    });

    test('It should fail to retrieve context from a not joined private room', async (assert) => {
        const roomID = datatype.uuid();
        const room = {
            roomID,
            roomName: random.words(3),
            isOpen: false,
        };
        const creatorUserID = datatype.uuid();

        await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [room],
        });

        //User retrieving room context
        const roomsIDs = Array.from({
            length: datatype.number({ min: 3, max: 7 }),
        }).map(() => ({
            roomID: datatype.uuid(),
            roomName: random.words(3),
        }));
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: roomsIDs,
        });
        ///

        sinon
            .stub(MpeServerToTemporalController, 'getStateQuery')
            .callsFake(async () => {
                assert.isTrue(false);

                throw new Error('Should never occurs');
            });

        const getMpeContextSuccessSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_SUCCESS_CALLBACK',
        );

        const getMpeContextFailSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_FAIL_CALLBACK',
        );

        socket.emit('MPE_GET_CONTEXT', {
            roomID,
        });

        await waitFor(() => {
            assert.isTrue(
                getMpeContextFailSpy.calledOnceWithExactly({
                    roomID,
                }),
            );
            assert.isTrue(getMpeContextSuccessSpy.notCalled);
        });
    });

    test('It should retrieve context from a not joined but invited in private room', async (assert) => {
        const roomID = datatype.uuid();
        const room = {
            roomID,
            roomName: random.words(3),
            isOpen: false,
        };
        const creatorUserID = datatype.uuid();

        const creatorSocket = await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [room],
        });

        //User retrieving room context
        const roomsIDs = Array.from({
            length: datatype.number({ min: 3, max: 7 }),
        }).map(() => ({
            roomID: datatype.uuid(),
            roomName: random.words(3),
        }));
        const invitedUserID = datatype.uuid();
        const invitedUserSocket = await createUserAndGetSocket({
            userID: invitedUserID,
            mpeRoomIDToAssociate: roomsIDs,
        });
        ///

        const state = generateMpeWorkflowStateWithUserRelatedInformation({
            overrides: {
                roomID,
                roomCreatorUserID: creatorUserID,
            },
            userID: invitedUserID,
        });

        sinon
            .stub(MpeServerToTemporalController, 'getStateQuery')
            .callsFake(async ({ workflowID }) => {
                assert.equal(roomID, workflowID);

                return {
                    state,
                    workflowID: state.roomID,
                };
            });

        const getMpeContextSuccessSpy = createSpyOnClientSocketEvent(
            invitedUserSocket,
            'MPE_GET_CONTEXT_SUCCESS_CALLBACK',
        );

        const getMpeContextFailSpy = createSpyOnClientSocketEvent(
            invitedUserSocket,
            'MPE_GET_CONTEXT_FAIL_CALLBACK',
        );

        const invitedUserReceivedMpeRoomInvitationSpy =
            createSpyOnClientSocketEvent(
                invitedUserSocket,
                'MPE_RECEIVED_ROOM_INVITATION',
            );

        creatorSocket.emit('MPE_CREATOR_INVITE_USER', {
            invitedUserID,
            roomID,
        });

        await waitFor(() => {
            assert.isTrue(invitedUserReceivedMpeRoomInvitationSpy.calledOnce);
        });

        invitedUserSocket.emit('MPE_GET_CONTEXT', {
            roomID,
        });

        await waitFor(() => {
            assert.isTrue(getMpeContextFailSpy.notCalled);
            assert.isTrue(
                getMpeContextSuccessSpy.calledWithExactly({
                    roomID,
                    state,
                    userIsNotInRoom: true,
                }),
            );
        });
    });

    test('It should retrieve context from a joined private room', async (assert) => {
        const roomID = datatype.uuid();
        const room = {
            roomID,
            roomName: random.words(3),
            isOpen: false,
        };
        const creatorUserID = datatype.uuid();

        await createUserAndGetSocket({
            userID: creatorUserID,
            mpeRoomIDToAssociate: [room],
        });

        //User retrieving room context
        const roomsIDs = Array.from({
            length: datatype.number({ min: 3, max: 7 }),
        }).map(() => ({
            roomID: datatype.uuid(),
            roomName: random.words(3),
        }));
        const userID = datatype.uuid();
        const socket = await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: [...roomsIDs, room],
        });
        ///

        const state = generateMpeWorkflowStateWithUserRelatedInformation({
            overrides: {
                roomID,
                roomCreatorUserID: creatorUserID,
            },
            userID,
        });

        sinon
            .stub(MpeServerToTemporalController, 'getStateQuery')
            .callsFake(async ({ workflowID }) => {
                assert.equal(roomID, workflowID);

                return {
                    state,
                    workflowID: state.roomID,
                };
            });

        const getMpeContextSuccessSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_SUCCESS_CALLBACK',
        );

        const getMpeContextFailSpy = createSpyOnClientSocketEvent(
            socket,
            'MPE_GET_CONTEXT_FAIL_CALLBACK',
        );

        socket.emit('MPE_GET_CONTEXT', {
            roomID,
        });

        await waitFor(() => {
            assert.isTrue(getMpeContextFailSpy.notCalled);
            assert.isTrue(
                getMpeContextSuccessSpy.calledWithExactly({
                    roomID,
                    state,
                    userIsNotInRoom: false,
                }),
            );
        });
    });
});
