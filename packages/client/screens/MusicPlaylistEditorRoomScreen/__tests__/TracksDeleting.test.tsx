import { MpeWorkflowState } from '@musicroom/types';
import { datatype } from 'faker';
import Toast from 'react-native-toast-message';
import { serverSocket } from '../../../services/websockets';
import { generateTrackMetadata } from '../../../tests/data';
import {
    renderApp,
    fireEvent,
    waitFor,
    within,
    waitForElementToBeRemoved,
} from '../../../tests/tests-utils';

function toTrackCardContainerTestID(id: string): string {
    return `${id}-track-card-container`;
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

test('Delete track and trigger sucess toast', async () => {
    const { screen, state } = await createMpeRoom();
    const trackAlreadyInPlaylist = state.value!.tracks[0];

    serverSocket.on('MPE_DELETE_TRACKS', ({ tracksIDs }) => {
        setImmediate(() => {
            state.value = {
                ...state.value!,
                tracks: state.value!.tracks.filter((track) => {
                    const shouldDeleteTrack = tracksIDs.some(
                        (id) => id === track.id,
                    );
                    const shouldKeepEntry = shouldDeleteTrack === false;

                    return shouldKeepEntry;
                }),
            };

            serverSocket.emit('MPE_DELETE_TRACKS_SUCCESS_CALLBACK', {
                roomID: state.value.roomID,
                state: state.value,
            });
        });
    });

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

    await Promise.all([
        waitForTrackCardElementToDisappearPromise,

        waitFor(() => {
            expect(Toast.show).toHaveBeenNthCalledWith(1, {
                type: 'success',
                text1: expect.any(String),
            });
        }),
    ]);
});
