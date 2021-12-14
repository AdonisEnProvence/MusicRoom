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

export function toTrackCardContainerTestID(id: string): string {
    return `${id}-track-card-container`;
}

interface StateRef {
    value: MpeWorkflowState | undefined;
}

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
