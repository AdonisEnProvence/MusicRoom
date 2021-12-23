import { MpeWorkflowState } from '@musicroom/types';
import { datatype } from 'faker';
import { serverSocket } from '../services/websockets';
import { db, generateMpeWorkflowState, generateTrackMetadata } from './data';
import { fireEvent, render, renderApp, waitFor } from './tests-utils';

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
    const state = generateMpeWorkflowState({
        isOpen: true,
        isOpenOnlyInvitedUsersCanEdit: false,
        playlistTotalDuration: 42000,
        roomCreatorUserID: datatype.uuid(),
        roomID,
        tracks: [track],
        usersLength: 1,
    });
    db.searchableMpeRooms.create({
        roomName: state.name,
        isInvited: false,
        roomID,
    });

    serverSocket.on('MPE_CREATE_ROOM', () => {
        serverSocket.emit('MPE_CREATE_ROOM_SYNCED_CALLBACK', state);

        setTimeout(() => {
            serverSocket.emit('MPE_CREATE_ROOM_CALLBACK', state);
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

    const mpeRoomListElement = await waitFor(() => {
        const [, libraryScreenTitle] = screen.getAllByText(/library/i);
        expect(libraryScreenTitle).toBeTruthy();
        const mpeRoomListElement = screen.getByText(new RegExp(state.name));
        expect(mpeRoomListElement).toBeTruthy();
        return mpeRoomListElement;
    });

    fireEvent.press(mpeRoomListElement);

    await waitFor(() => {
        const playlistTitle = screen.getByText(
            new RegExp(`Playlist.*${state.name}`),
        );
        expect(playlistTitle).toBeTruthy();
    });

    return {
        screen,
        state: {
            value: state,
        },
    };
}
