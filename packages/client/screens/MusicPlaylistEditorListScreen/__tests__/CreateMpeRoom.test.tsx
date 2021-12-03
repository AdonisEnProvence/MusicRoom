import { renderApp, fireEvent, waitFor } from '../../../tests/tests-utils';

test('Create static MPE room and have it listed in MPE Rooms List', async () => {
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
    });

    const mpeRoomListItem = await screen.findByText(/^mpe (?<RoomName>.*)$/i);
    expect(mpeRoomListItem).toBeTruthy();

    fireEvent.press(mpeRoomListItem);

    await waitFor(() => {
        const playlistTitle = screen.getByText(/^playlist (?<PlaylistID>.*)$/i);
        expect(playlistTitle).toBeTruthy();
    });
});
