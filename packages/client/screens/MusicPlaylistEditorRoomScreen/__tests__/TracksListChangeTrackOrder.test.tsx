import {
    AllClientToServerEvents,
    MpeChangeTrackOrderOperationToApply,
} from '@musicroom/types';
import Toast from 'react-native-toast-message';
import { db } from '../../../tests/data';
import {
    fireEvent,
    waitFor,
    within,
    waitForElementToBeRemoved,
    render,
    toTrackCardContainerTestID,
} from '../../../tests/tests-utils';
import { createMpeRoom, DefinedStateRef } from '../../../tests/tests-mpe-utils';
import { serverSocket } from '../../../services/websockets';

function extractTrackIDFromCardContainerTestID(testID: string): string {
    return testID.replace('-track-card-container', '');
}

async function playlistUIHasUnfreezed(screen: ReturnType<typeof render>) {
    return await waitFor(() => {
        expect(screen.getByText(/add.*track/i)).not.toBeDisabled();
    });
}

async function addTrack({
    screen,
    trackToAdd,
    state,
}: {
    screen: ReturnType<typeof render>;
    trackToAdd: ReturnType<typeof db['searchableTracks']['create']>;
    state: DefinedStateRef;
}) {
    const addTracksSpy = jest.fn<
        ReturnType<AllClientToServerEvents['MPE_ADD_TRACKS']>,
        Parameters<AllClientToServerEvents['MPE_ADD_TRACKS']>
    >(({ roomID }) => {
        setTimeout(() => {
            state.value = {
                ...state.value,
                tracks: [...state.value.tracks, trackToAdd],
            };

            serverSocket.emit('MPE_ADD_TRACKS_SUCCESS_CALLBACK', {
                roomID,
                state: state.value,
            });
        }, 10);
    });
    serverSocket.on('MPE_ADD_TRACKS', addTracksSpy);

    const addTrackButton = await screen.findByText(/add.*track/i);
    expect(addTrackButton).toBeTruthy();

    fireEvent.press(addTrackButton);

    const searchTrackInput = await waitFor(() => {
        const searchTrackInputElement =
            screen.getByPlaceholderText(/search.*track/i);
        expect(searchTrackInputElement).toBeTruthy();

        return searchTrackInputElement;
    });

    fireEvent(searchTrackInput, 'focus');
    fireEvent.changeText(searchTrackInput, trackToAdd.title.slice(0, 3));
    fireEvent(searchTrackInput, 'submitEditing');

    const searchedTrackCard = await waitFor(() => {
        const searchedTrackCardElement = screen.getByText(trackToAdd.title);
        expect(searchedTrackCardElement).toBeTruthy();

        return searchedTrackCardElement;
    });

    const waitForSearchTrackInputToDisappearPromise = waitForElementToBeRemoved(
        () => screen.getByPlaceholderText(/search.*track/i),
    );

    fireEvent.press(searchedTrackCard);

    await waitForSearchTrackInputToDisappearPromise;

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'success',
            text1: expect.any(String),
        });
    });

    await waitFor(() => {
        expect(screen.getByText(/add.*track/i)).not.toBeDisabled();
    });
}

/**
 * Will emit corresponding client socket event to perform a change track order operation
 * Will also check that track has been moved
 * Warning: don't forget to init the serverSocket handlers
 * ShouldFail is an optionnal parameter that allow to fake a failure upper a valid operation
 */
async function changeTrackOrder({
    screen,
    state,
    trackToMove: { operationToApply, fromIndex },
    shouldFail,
}: {
    state: DefinedStateRef;
    screen: ReturnType<typeof render>;
    trackToMove: {
        fromIndex: number;
        operationToApply: MpeChangeTrackOrderOperationToApply;
    };
    shouldFail?: boolean;
}): Promise<void> {
    const destIndex =
        fromIndex +
        (operationToApply === MpeChangeTrackOrderOperationToApply.Values.DOWN
            ? 1
            : -1);

    /**
     * Using waitFor and playlistUIHasUnfreezed to prevent any calling test context issue
     */
    const trackCardElements = screen.getAllByTestId(/track-card-container/i);
    expect(trackCardElements.length).toBe(state.value.tracks.length);

    const tracksIDs = trackCardElements.map(({ props: { testID } }) =>
        extractTrackIDFromCardContainerTestID(testID),
    );

    await playlistUIHasUnfreezed(screen);

    expect(fromIndex < state.value.tracks.length).toBeTruthy();

    const moveDownTrackButton = within(
        trackCardElements[fromIndex],
    ).getByLabelText(/move.*down/i);
    expect(moveDownTrackButton).toBeTruthy();

    const moveUpTrackButton = within(
        trackCardElements[fromIndex],
    ).getByLabelText(/move.*up/i);
    expect(moveUpTrackButton).toBeTruthy();

    const trackToMoveIsFirstTrack = fromIndex === 0;
    const trackToMoveIsLastTrack = fromIndex === state.value.tracks.length - 1;
    if (trackToMoveIsFirstTrack) {
        expect(moveUpTrackButton).toBeDisabled();
        expect(moveDownTrackButton).not.toBeDisabled();
    } else if (trackToMoveIsLastTrack) {
        expect(moveUpTrackButton).toBeEnabled();
        expect(moveDownTrackButton).toBeDisabled();
    } else {
        expect(moveUpTrackButton).not.toBeDisabled();
        expect(moveDownTrackButton).not.toBeDisabled();
    }

    if (operationToApply === MpeChangeTrackOrderOperationToApply.Values.DOWN) {
        fireEvent.press(moveDownTrackButton);
    } else {
        fireEvent.press(moveUpTrackButton);
    }

    if (!shouldFail) {
        await waitFor(() => {
            const trackCardElements =
                screen.getAllByTestId(/track-card-container/i);
            expect(trackCardElements.length).toBe(state.value.tracks.length);

            /**
             * Tracks have been swapped
             */
            expect(trackCardElements[fromIndex]).toHaveProp(
                'testID',
                toTrackCardContainerTestID(tracksIDs[destIndex]),
            );
            expect(trackCardElements[destIndex]).toHaveProp(
                'testID',
                toTrackCardContainerTestID(tracksIDs[fromIndex]),
            );
        });

        await playlistUIHasUnfreezed(screen);
    }
}

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
            state: state.value,
        });

        serverSocket.emit('MPE_TRACKS_LIST_UPDATE', {
            roomID: state.value.roomID,
            state: state.value,
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
