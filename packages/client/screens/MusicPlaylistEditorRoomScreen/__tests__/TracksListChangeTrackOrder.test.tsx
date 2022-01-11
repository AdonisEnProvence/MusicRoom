import { MpeChangeTrackOrderOperationToApply } from '@musicroom/types';
import Toast from 'react-native-toast-message';
import { db } from '../../../tests/data';
import { waitFor } from '../../../tests/tests-utils';
import {
    addTrack,
    changeTrackOrder,
    createMpeRoom,
} from '../../../tests/tests-mpe-utils';
import { serverSocket } from '../../../services/websockets';

test('Move track', async () => {
    const { screen, state } = await createMpeRoom();
    const fakeTracks = [
        db.searchableTracks.create(),
        db.searchableTracks.create(),
    ];

    //Init serverSocket listeners
    const changeTrackOrderHandler = ({
        destIndex,
        fromIndex,
    }: {
        destIndex: number;
        fromIndex: number;
    }) => {
        [state.value.tracks[fromIndex], state.value.tracks[destIndex]] = [
            state.value.tracks[destIndex],
            state.value.tracks[fromIndex],
        ];

        serverSocket.emit('MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK', {
            roomID: state.value.roomID,
            state: {
                ...state.value,
                userRelatedInformation: null,
            },
        });

        serverSocket.emit('MPE_TRACKS_LIST_UPDATE', {
            roomID: state.value.roomID,
            state: {
                ...state.value,
                userRelatedInformation: null,
            },
        });
    };

    serverSocket.on('MPE_CHANGE_TRACK_ORDER_DOWN', ({ fromIndex }) => {
        changeTrackOrderHandler({
            fromIndex,
            destIndex: fromIndex + 1,
        });
    });

    serverSocket.on('MPE_CHANGE_TRACK_ORDER_UP', ({ fromIndex }) => {
        changeTrackOrderHandler({
            fromIndex,
            destIndex: fromIndex - 1,
        });
    });
    ///

    await addTrack({
        screen,
        state,
        trackToAdd: fakeTracks[0],
    });

    await changeTrackOrder({
        screen,
        state,
        trackToMove: {
            fromIndex: 0,
            operationToApply: MpeChangeTrackOrderOperationToApply.Values.DOWN,
        },
    });

    //First time is during add track step
    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(2, {
            type: 'success',
            text1: expect.any(String),
        });
    });

    await changeTrackOrder({
        screen,
        state,
        trackToMove: {
            fromIndex: 1,
            operationToApply: MpeChangeTrackOrderOperationToApply.Values.UP,
        },
    });

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(3, {
            type: 'success',
            text1: expect.any(String),
        });
    });
});

//hacking my way out to display a change track order error toast
test('after receiving a MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK it should display a failure toast', async () => {
    const { screen, state } = await createMpeRoom();
    const fakeTracks = [
        db.searchableTracks.create(),
        db.searchableTracks.create(),
    ];

    //Init serverSocket listeners
    serverSocket.on('MPE_CHANGE_TRACK_ORDER_DOWN', ({ roomID }) => {
        serverSocket.emit('MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK', {
            roomID,
        });
    });

    serverSocket.on('MPE_CHANGE_TRACK_ORDER_UP', ({ roomID }) => {
        serverSocket.emit('MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK', {
            roomID,
        });
    });
    ///

    await addTrack({
        screen,
        state,
        trackToAdd: fakeTracks[0],
    });

    await changeTrackOrder({
        screen,
        state,
        shouldFail: true,
        trackToMove: {
            fromIndex: 0,
            operationToApply: MpeChangeTrackOrderOperationToApply.Values.DOWN,
        },
    });

    //First time is during add track step
    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(2, {
            type: 'error',
            text1: expect.any(String),
        });
    });
});
