import {
    AllClientToServerEvents,
    MpeChangeTrackOrderOperationToApply,
    MpeWorkflowState,
} from '@musicroom/types';
import {
    waitForElementToBeRemoved,
    within,
} from '@testing-library/react-native';
import { datatype } from 'faker';
import Toast from 'react-native-toast-message';
import { stateValuesEqual } from 'xstate/lib/State';
import { serverSocket } from '../services/websockets';
import { db, generateMpeWorkflowState, generateTrackMetadata } from './data';
import {
    extractTrackIDFromCardContainerTestID,
    fireEvent,
    render,
    renderApp,
    toTrackCardContainerTestID,
    waitFor,
} from './tests-utils';

export interface DefinedStateRef {
    value: MpeWorkflowState;
}

/**
 * Copy-pasted from https://github.com/AdonisEnProvence/MusicRoom/blob/05409fdb003d7060de8a7314a23d923e6704d398/packages/client/screens/MusicPlaylistEditorListScreen/__tests__/CreateMpeRoom.test.tsx.
 */
export async function createMpeRoom(): Promise<{
    screen: ReturnType<typeof render>;
    state: DefinedStateRef;
}> {
    const track = generateTrackMetadata();
    const roomID = datatype.uuid();
    const mpeRoomState = generateMpeWorkflowState({
        isOpen: true,
        isOpenOnlyInvitedUsersCanEdit: false,
        playlistTotalDuration: 42000,
        roomCreatorUserID: datatype.uuid(),
        roomID,
        tracks: [track],
        usersLength: 1,
    });
    db.searchableMpeRooms.create({
        roomID: mpeRoomState.roomID,
        isOpen: mpeRoomState.isOpen,
        roomName: mpeRoomState.name,
    });

    const screen = await renderApp();

    expect((await screen.findAllByText(/home/i)).length).toBeGreaterThanOrEqual(
        1,
    );

    const goToLibraryButton = screen.getByText(/library/i);
    expect(goToLibraryButton).toBeTruthy();

    serverSocket.emit('MPE_CREATE_ROOM_SYNCED_CALLBACK', mpeRoomState);
    serverSocket.emit('MPE_CREATE_ROOM_CALLBACK', mpeRoomState);

    fireEvent.press(goToLibraryButton);

    await waitFor(() => {
        const [, libraryScreenTitle] = screen.getAllByText(/library/i);
        expect(libraryScreenTitle).toBeTruthy();
    });

    const mpeRoomListItem = await screen.findByText(
        new RegExp(mpeRoomState.name),
    );
    expect(mpeRoomListItem).toBeTruthy();

    fireEvent.press(mpeRoomListItem);

    await waitFor(() => {
        const playlistTitle = screen.getByText(
            new RegExp(`Playlist.*${mpeRoomState.name}`),
        );
        expect(playlistTitle).toBeTruthy();
    });

    return {
        screen,
        state: {
            value: mpeRoomState,
        },
    };
}

export async function addTrack({
    screen,
    trackToAdd,
    state,
}: {
    screen: ReturnType<typeof render>;
    trackToAdd: ReturnType<typeof db['searchableTracks']['create']>;
    state: DefinedStateRef;
}): Promise<void> {
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

async function playlistUIHasUnfreezed(screen: ReturnType<typeof render>) {
    return await waitFor(() => {
        expect(screen.getByText(/add.*track/i)).not.toBeDisabled();
    });
}

/**
 * Will emit corresponding client socket event to perform a change track order operation
 * Will also check that track has been moved
 * Warning: don't forget to init the serverSocket handlers
 * ShouldFail is an optionnal parameter that allow to fake a failure upper a valid operation
 */
export async function changeTrackOrder({
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
        expect(moveUpTrackButton).not.toBeDisabled();
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

export async function hitJoinMpeRoomButton({
    screen,
    state,
}: {
    state: DefinedStateRef;
    screen: ReturnType<typeof render>;
}): Promise<void> {
    const joinRoomButton = screen.getByTestId(
        `mpe-join-${state.value.roomID}-absolute-button`,
    );
    expect(joinRoomButton).not.toBeDisabled();
    expect(joinRoomButton).toBeTruthy();

    for (const { id: trackID } of state.value.tracks) {
        //Should also look for specific room settings icon such as isOpen and why creatorName
        const listItem = await screen.findByTestId(
            `${trackID}-track-card-container`,
        );
        expect(listItem).toBeTruthy();

        const moveDownTrackButton =
            within(listItem).getByLabelText(/move.*down/i);
        expect(moveDownTrackButton).toBeTruthy();
        expect(moveDownTrackButton).toBeDisabled();

        const moveUpTrackButton = within(listItem).getByLabelText(/move.*up/i);
        expect(moveUpTrackButton).toBeTruthy();
        expect(moveUpTrackButton).toBeDisabled();

        const deleteTrackButton = within(listItem).getByLabelText(/delete/i);
        expect(deleteTrackButton).toBeTruthy();
        expect(deleteTrackButton).toBeDisabled();
    }

    fireEvent.press(joinRoomButton);

    await waitForElementToBeRemoved(() =>
        screen.getByTestId(`mpe-join-${state.value.roomID}-absolute-button`),
    );

    for (const [index, { id: trackID }] of state.value.tracks.entries()) {
        const isFirstElement = index === 0;
        const isLastTrack = index === state.value.tracks.length - 1;

        //Should also look for specific room settings icon such as isOpen and why creatorName
        const listItem = await screen.findByTestId(
            `${trackID}-track-card-container`,
        );
        expect(listItem).toBeTruthy();

        console.log(
            'SALUUUUUUUUUUUUUUUUUUUT',
            {
                isLastTrack,
                isFirstElement,
            },
            state.value.tracks.length,
        );
        const moveDownTrackButton =
            within(listItem).getByLabelText(/move.*down/i);
        expect(moveDownTrackButton).toBeTruthy();
        if (isLastTrack) {
            expect(moveDownTrackButton).toBeDisabled();
        } else {
            expect(moveDownTrackButton).not.toBeDisabled();
        }

        const moveUpTrackButton = within(listItem).getByLabelText(/move.*up/i);
        expect(moveUpTrackButton).toBeTruthy();
        if (isFirstElement) {
            expect(moveUpTrackButton).toBeDisabled();
        } else {
            expect(moveUpTrackButton).not.toBeDisabled();
        }

        const deleteTrackButton = within(listItem).getByLabelText(/delete/i);
        expect(deleteTrackButton).toBeTruthy();
        expect(deleteTrackButton).not.toBeDisabled();
    }
}
