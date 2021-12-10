import { AllClientToServerEvents, MpeWorkflowState } from '@musicroom/types';
import { datatype } from 'faker';
import Toast from 'react-native-toast-message';
import { serverSocket } from '../../../services/websockets';
import { db, generateTrackMetadata } from '../../../tests/data';
import {
    renderApp,
    fireEvent,
    waitFor,
    within,
    waitForElementToBeRemoved,
    render,
} from '../../../tests/tests-utils';

function toTrackCardContainerTestID(id: string): string {
    return `${id}-track-card-container`;
}

function extractTrackIDFromCardContainerTestID(testID: string): string {
    return testID.replace('-track-card-container', '');
}

interface StateRef {
    value: MpeWorkflowState | undefined;
}

/**
 * Copy-pasted from https://github.com/AdonisEnProvence/MusicRoom/blob/05409fdb003d7060de8a7314a23d923e6704d398/packages/client/screens/MusicPlaylistEditorListScreen/__tests__/CreateMpeRoom.test.tsx.
 */
async function createMpeRoom() {
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

    if (state === undefined) {
        throw new Error('state is undefined');
    }

    const mpeRoomListItem = await screen.findByText(
        new RegExp(state.value!.name),
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
        state,
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
                    ...state.value!,
                    tracks: [...state.value!.tracks, fakeTrack],
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
    const trackAlreadyInPlaylist = state.value!.tracks[0];

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
    state: StateRef;
}) {
    const addTracksSpy = jest.fn<
        ReturnType<AllClientToServerEvents['MPE_ADD_TRACKS']>,
        Parameters<AllClientToServerEvents['MPE_ADD_TRACKS']>
    >(({ roomID }) => {
        setTimeout(() => {
            state.value = {
                ...state.value!,
                tracks: [...state.value!.tracks, trackToAdd],
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

test('Move track', async () => {
    const { screen, state } = await createMpeRoom();
    const fakeTracks = [
        db.searchableTracks.create(),
        db.searchableTracks.create(),
    ];
    let tracksIDs: string[] = [];

    await addTrack({
        screen,
        state,
        trackToAdd: fakeTracks[0],
    });

    {
        /**
         * Ensure two tracks have been added
         */
        const trackCardElements = await waitFor(() => {
            const trackCardElements =
                screen.getAllByTestId(/track-card-container/i);
            expect(trackCardElements.length).toBe(2);

            return trackCardElements;
        });

        await waitFor(() => {
            const [addTrackButton] = screen.getAllByText(/add.*track/i);

            expect(addTrackButton).not.toBeDisabled();
        });

        tracksIDs = trackCardElements.map(({ props: { testID } }) =>
            extractTrackIDFromCardContainerTestID(testID),
        );

        /**
         * Move down the first track.
         */
        const moveDownFirstTrackButton = within(
            trackCardElements[0],
        ).getByLabelText(/move.*down/i);
        expect(moveDownFirstTrackButton).toBeTruthy();

        fireEvent.press(moveDownFirstTrackButton);
    }

    await waitFor(() => {
        const [addTrackButton] = screen.getAllByText(/add.*track/i);

        expect(addTrackButton).not.toBeDisabled();
    });

    {
        const trackCardElements =
            screen.getAllByTestId(/track-card-container/i);

        /**
         * Tracks have been swapped
         */
        expect(trackCardElements[0]).toHaveProp(
            'testID',
            toTrackCardContainerTestID(tracksIDs[1]),
        );
        expect(trackCardElements[1]).toHaveProp(
            'testID',
            toTrackCardContainerTestID(tracksIDs[0]),
        );

        /**
         * Move up the last track.
         */
        const moveUpLastTrackButton = within(
            trackCardElements[1],
        ).getByLabelText(/move.*up/i);
        expect(moveUpLastTrackButton).toBeTruthy();

        fireEvent.press(moveUpLastTrackButton);
    }

    await waitFor(() => {
        const [addTrackButton] = screen.getAllByText(/add.*track/i);

        expect(addTrackButton).not.toBeDisabled();
    });

    {
        const trackCardElements =
            screen.getAllByTestId(/track-card-container/i);

        /**
         * Tracks have returned their initial position.
         */
        expect(trackCardElements[0]).toHaveProp(
            'testID',
            toTrackCardContainerTestID(tracksIDs[0]),
        );
        expect(trackCardElements[1]).toHaveProp(
            'testID',
            toTrackCardContainerTestID(tracksIDs[1]),
        );
    }
});

test('Remove track', async () => {
    const { screen, state } = await createMpeRoom();
    const trackAlreadyInPlaylist = state.value!.tracks[0];

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
