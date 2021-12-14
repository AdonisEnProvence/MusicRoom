import {
    AllClientToServerEvents,
    MpeChangeTrackOrderOperationToApply,
    MpeWorkflowState,
} from '@musicroom/types';
import { datatype } from 'faker';
import Toast from 'react-native-toast-message';
import { serverSocket } from '../../../services/websockets';
import { db, generateTrackMetadata } from '../../../tests/data';
import {
    extractTrackIDFromCardContainerTestID,
    fireEvent,
    render,
    renderApp,
    waitFor,
    waitForElementToBeRemoved,
    within,
} from '../../../tests/tests-utils';

function toTrackCardContainerTestID(id: string): string {
    return `${id}-track-card-container`;
}

interface StateRef {
    value: MpeWorkflowState | undefined;
}

interface DefinedStateRef {
    value: MpeWorkflowState;
}

/**
 * Copy-pasted from https://github.com/AdonisEnProvence/MusicRoom/blob/05409fdb003d7060de8a7314a23d923e6704d398/packages/client/screens/MusicPlaylistEditorListScreen/__tests__/CreateMpeRoom.test.tsx.
 */
async function createMpeRoom(): Promise<{
    screen: ReturnType<typeof render>;
    state: DefinedStateRef;
}> {
    const track = generateTrackMetadata();

    const state: StateRef = {
        value: undefined,
    };
    serverSocket.on('MPE_CREATE_ROOM', (params) => {
        state.value = {
            isOpen: params.isOpen,
            isOpenOnlyInvitedUsersCanEdit: params.isOpenOnlyInvitedUsersCanEdit,
            name: params.name,
            playlistTotalDuration: 42000,
            roomCreatorUserID: datatype.uuid(),
            roomID: datatype.uuid(),
            tracks: [track],
            usersLength: 1,
        };

        serverSocket.emit('MPE_CREATE_ROOM_SYNCED_CALLBACK', state.value);

        setTimeout(() => {
            if (state.value === undefined) {
                throw new Error('state is undefined');
            }
            serverSocket.emit('MPE_CREATE_ROOM_CALLBACK', state.value);
        }, 10);
    });

    const screen = await renderApp();

    expect((await screen.findAllByText(/home/i)).length).toBeGreaterThanOrEqual(
        1,
    );

    const createMpeRoomButton = screen.getByText(/create.*mpe/i);
    expect(createMpeRoomButton).toBeTruthy();

    fireEvent.press(createMpeRoomButton);

    const goToLibraryButton = screen.getByText(/library/i);
    expect(goToLibraryButton).toBeTruthy();

    fireEvent.press(goToLibraryButton);

    await waitFor(() => {
        const [, libraryScreenTitle] = screen.getAllByText(/library/i);
        expect(libraryScreenTitle).toBeTruthy();
        expect(state).not.toBeUndefined();
    });

    if (state.value === undefined) {
        throw new Error('state is undefined');
    }

    const mpeRoomListItem = await screen.findByText(
        new RegExp(state.value.name),
    );
    expect(mpeRoomListItem).toBeTruthy();

    fireEvent.press(mpeRoomListItem);

    await waitFor(() => {
        const playlistTitle = screen.getByText(
            new RegExp(`Playlist.*${state.value!.name}`),
        );
        expect(playlistTitle).toBeTruthy();
    });

    return {
        screen,
        state: {
            value: state.value,
        },
    };
}

test('Add track and trigger sucess toast', async () => {
    const fakeTrack = db.searchableTracks.create();

    const { screen, state } = await createMpeRoom();

    const addTracksSpy = jest.fn<
        ReturnType<AllClientToServerEvents['MPE_ADD_TRACKS']>,
        Parameters<AllClientToServerEvents['MPE_ADD_TRACKS']>
    >(({ roomID }) => {
        setTimeout(() => {
            serverSocket.emit('MPE_ADD_TRACKS_SUCCESS_CALLBACK', {
                roomID,
                state: {
                    ...state.value,
                    tracks: [...state.value.tracks, fakeTrack],
                },
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
    fireEvent.changeText(searchTrackInput, fakeTrack.title.slice(0, 3));
    fireEvent(searchTrackInput, 'submitEditing');

    const searchedTrackCard = await waitFor(() => {
        const searchedTrackCardElement = screen.getByText(fakeTrack.title);
        expect(searchedTrackCardElement).toBeTruthy();

        return searchedTrackCardElement;
    });

    const waitForSearchTrackInputToDisappearPromise = waitForElementToBeRemoved(
        () => screen.getByPlaceholderText(/search.*track/i),
    );

    fireEvent.press(searchedTrackCard);

    await waitForSearchTrackInputToDisappearPromise;

    // There operations should occur concurrently.
    await Promise.all([
        waitFor(() => {
            const trackCardElement = screen.getByText(fakeTrack.title);
            expect(trackCardElement).toBeTruthy();
        }),

        waitFor(() => {
            expect(Toast.show).toHaveBeenNthCalledWith(1, {
                type: 'success',
                text1: expect.any(String),
            });
        }),
    ]);

    await waitFor(() => {
        expect(screen.getByText(/add.*track/i)).not.toBeDisabled();
    });
});

test('Fail when adding track already in playlist', async () => {
    const { screen, state } = await createMpeRoom();
    const trackAlreadyInPlaylist = state.value.tracks[0];

    db.searchableTracks.create(trackAlreadyInPlaylist);

    const addTracksSpy = jest.fn<
        ReturnType<AllClientToServerEvents['MPE_ADD_TRACKS']>,
        Parameters<AllClientToServerEvents['MPE_ADD_TRACKS']>
    >(({ roomID }) => {
        setTimeout(() => {
            serverSocket.emit('MPE_ADD_TRACKS_FAIL_CALLBACK', {
                roomID,
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
    fireEvent.changeText(
        searchTrackInput,
        trackAlreadyInPlaylist.title.slice(0, 3),
    );
    fireEvent(searchTrackInput, 'submitEditing');

    const searchedTrackCard = await waitFor(() => {
        const [, searchedTrackCardElement] = screen.getAllByText(
            trackAlreadyInPlaylist.title,
        );
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
            type: 'error',
            text1: expect.any(String),
        });
    });

    await waitFor(() => {
        expect(screen.getByText(/add.*track/i)).not.toBeDisabled();
    });
});

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

async function playlistUIHasUnfreezed(screen: ReturnType<typeof render>) {
    await waitFor(() => {
        const [addTrackButton] = screen.getAllByText(/add.*track/i);

        expect(addTrackButton).not.toBeDisabled();
    });
}

/**
 * Will emit corresponding client socket event to perform a change track order operation
 * Will also check that track has been moved
 * Warning: don't forget to init the serverSocket handlers
 */
async function changeTrackOrder({
    screen,
    state,
    trackToMove: { operationToApply, fromIndex },
}: {
    state: DefinedStateRef;
    screen: ReturnType<typeof render>;
    trackToMove: {
        fromIndex: number;
        operationToApply: MpeChangeTrackOrderOperationToApply;
    };
}): Promise<void> {
    const destIndex =
        fromIndex +
        (operationToApply === MpeChangeTrackOrderOperationToApply.Values.DOWN
            ? 1
            : -1);

    /**
     * Using waitFor and playlistUIHasUnfreezed to prevent any calling test context issue
     */
    const trackCardElements = await waitFor(() => {
        const trackCardElements =
            screen.getAllByTestId(/track-card-container/i);
        expect(trackCardElements.length).toBe(state.value.tracks.length);

        return trackCardElements;
    });

    await waitFor(async () => {
        await playlistUIHasUnfreezed(screen);
    });

    const tracksIDs = trackCardElements.map(({ props: { testID } }) =>
        extractTrackIDFromCardContainerTestID(testID),
    );

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

    await waitFor(async () => {
        await playlistUIHasUnfreezed(screen);
    });

    {
        const trackCardElements =
            screen.getAllByTestId(/track-card-container/i);

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
        console.log(state.value.tracks);
        [state.value.tracks[fromIndex], state.value.tracks[destIndex]] = [
            state.value.tracks[destIndex],
            state.value.tracks[fromIndex],
        ];
        console.log(state.value.tracks);

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

    console.log('FIRST TRACK', state.value);
    // await changeTrackOrder({
    //     screen,
    //     state,
    //     trackToMove: {
    //         fromIndex: 0,
    //         operationToApply: MpeChangeTrackOrderOperationToApply.Values.DOWN,
    //     },
    // });
    console.log('SECOND TRACK', state.value);
    await changeTrackOrder({
        screen,
        state,
        trackToMove: {
            fromIndex: 1,
            operationToApply: MpeChangeTrackOrderOperationToApply.Values.UP,
        },
    });
});

test('Remove track', async () => {
    const { screen, state } = await createMpeRoom();
    const trackAlreadyInPlaylist = state.value.tracks[0];

    const trackCard = await waitFor(() => {
        const trackCardElement = screen.getByTestId(
            toTrackCardContainerTestID(trackAlreadyInPlaylist.id),
        );
        expect(trackCardElement).toBeTruthy();

        return trackCardElement;
    });

    const deleteTrackButton = within(trackCard).getByLabelText(/delete/i);
    expect(deleteTrackButton).toBeTruthy();

    const waitForTrackCardElementToDisappearPromise = waitForElementToBeRemoved(
        () => screen.getByText(trackAlreadyInPlaylist.title),
    );

    fireEvent.press(deleteTrackButton);

    await waitForTrackCardElementToDisappearPromise;
});
