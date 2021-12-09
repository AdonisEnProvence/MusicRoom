import { MpeWorkflowState } from '@musicroom/types';
import { datatype } from 'faker';
import { serverSocket } from '../../../services/websockets';
import { generateTrackMetadata } from '../../../tests/data';
import { renderApp, fireEvent, waitFor } from '../../../tests/tests-utils';

test('Create static MPE room and have it listed in MPE Rooms List', async () => {
    const screen = await renderApp();
    const track = generateTrackMetadata();

    expect((await screen.findAllByText(/home/i)).length).toBeGreaterThanOrEqual(
        1,
    );

    const createMpeRoomButton = screen.getByText(/create.*mpe/i);
    expect(createMpeRoomButton).toBeTruthy();

    let state: MpeWorkflowState | undefined;
    serverSocket.on('MPE_CREATE_ROOM', (params) => {
        state = {
            isOpen: params.isOpen,
            isOpenOnlyInvitedUsersCanEdit: params.isOpenOnlyInvitedUsersCanEdit,
            name: params.name,
            playlistTotalDuration: 42000,
            roomCreatorUserID: datatype.uuid(),
            roomID: datatype.uuid(),
            tracks: [track],
            usersLength: 1,
        };

        serverSocket.emit('MPE_CREATE_ROOM_SYNCED_CALLBACK', state);

        setTimeout(() => {
            if (state === undefined) {
                throw new Error('state is undefined');
            }
            serverSocket.emit('MPE_CREATE_ROOM_CALLBACK', state);
        }, 10);
    });

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
        expect(false).toBeTruthy();
        throw new Error('state is undefined');
    }

    const stateCpy = state;

    const roomListElement = screen.getByTestId(`mpe-room-card-${state.roomID}`);
    fireEvent.press(roomListElement);

    await waitFor(() => {
        const playlistTitle = screen.getByText(
            new RegExp(`Playlist ${stateCpy.name}`),
        );
        expect(playlistTitle).toBeTruthy();
        expect(
            screen.getByText(new RegExp(`${stateCpy.playlistTotalDuration}`)),
        );
        expect(
            screen.getByText(new RegExp(`${stateCpy.tracks?.length}.*Tracks`)),
        );
    });
});
