import { MpeWorkflowState } from '@musicroom/types';
import { datatype } from 'faker';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from './data';
import { fireEvent, render, renderApp, waitFor } from './tests-utils';

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
