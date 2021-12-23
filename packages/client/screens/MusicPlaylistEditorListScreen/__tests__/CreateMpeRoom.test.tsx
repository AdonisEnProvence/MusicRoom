import { datatype } from 'faker';
import { serverSocket } from '../../../services/websockets';
import {
    db,
    generateMpeWorkflowState,
    generateTrackMetadata,
} from '../../../tests/data';
import { renderApp, fireEvent, waitFor } from '../../../tests/tests-utils';

test('Create static MPE room and have it listed in MPE Rooms List', async () => {
    const screen = await renderApp();
    const track = generateTrackMetadata();
    const roomID = datatype.uuid();
    const state = generateMpeWorkflowState({
        isOpen: true,
        isOpenOnlyInvitedUsersCanEdit: false,
        roomID,
        tracks: [track],
        usersLength: 1,
    });
    db.searchableMpeRooms.create({
        isInvited: false,
        roomID,
        roomName: state.name,
    });

    expect((await screen.findAllByText(/home/i)).length).toBeGreaterThanOrEqual(
        1,
    );

    const createMpeRoomButton = screen.getByText(/create.*mpe/i);
    expect(createMpeRoomButton).toBeTruthy();

    serverSocket.on('MPE_CREATE_ROOM', () => {
        serverSocket.emit('MPE_CREATE_ROOM_SYNCED_CALLBACK', state);

        setTimeout(() => {
            serverSocket.emit('MPE_CREATE_ROOM_CALLBACK', state);
        }, 10);
    });

    fireEvent.press(createMpeRoomButton);

    const goToLibraryButton = screen.getByText(/library/i);
    expect(goToLibraryButton).toBeTruthy();

    fireEvent.press(goToLibraryButton);

    const roomListElement = await waitFor(() => {
        const [, libraryScreenTitle] = screen.getAllByText(/library/i);
        expect(libraryScreenTitle).toBeTruthy();
        const roomListElement = screen.getByTestId(
            `mpe-room-card-${state.roomID}`,
        );
        expect(roomListElement).toBeTruthy();
        return roomListElement;
    });

    fireEvent.press(roomListElement);

    await waitFor(() => {
        const playlistTitle = screen.getByText(
            new RegExp(`Playlist ${state.name}`),
        );
        expect(playlistTitle).toBeTruthy();
        expect(screen.getByText(new RegExp(`${state.playlistTotalDuration}`)));
        expect(screen.getByText(new RegExp(`${state.tracks?.length}.*Tracks`)));
    });
});
