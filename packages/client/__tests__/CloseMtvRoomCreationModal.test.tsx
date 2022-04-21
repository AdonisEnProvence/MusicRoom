import { db } from '../tests/data';
import {
    findBottomBarSearchButton,
    fireEvent,
    renderApp,
    waitFor,
} from '../tests/tests-utils';

test('MtvRoom creation form modal can be closed', async () => {
    const screen = await renderApp();
    const fakeTrack = db.searchableTracks.create();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const searchScreenLink = await findBottomBarSearchButton({ screen });

    fireEvent.press(searchScreenLink);

    await waitFor(() =>
        expect(screen.getByText(/search.*track/i)).toBeTruthy(),
    );

    const searchInput = await screen.findByPlaceholderText(/search.*track/i);
    expect(searchInput).toBeTruthy();

    const SEARCH_QUERY = fakeTrack.title.slice(0, 3);

    /**
     * To simulate a real interaction with a text input, we need to:
     * 1. Focus it
     * 2. Change its text
     * 3. Submit the changes
     */
    fireEvent(searchInput, 'focus');
    fireEvent.changeText(searchInput, SEARCH_QUERY);
    fireEvent(searchInput, 'submitEditing');

    const trackResultListItem = await screen.findByText(fakeTrack.title);
    expect(trackResultListItem).toBeTruthy();

    fireEvent.press(trackResultListItem);

    const creationModal = await screen.findByText(/what.*to.*do.*track/i);
    expect(creationModal).toBeTruthy();

    const createMtvRoomButton = screen.getByText(/create.*mtv/i);
    expect(createMtvRoomButton).toBeTruthy();

    fireEvent.press(createMtvRoomButton);

    await waitFor(() => {
        const roomCreationFormFirstStepTitle =
            screen.getByText(/what.*is.*name.*room/i);
        expect(roomCreationFormFirstStepTitle).toBeTruthy();
    });

    const goBackButton = screen.getByText(/back/i);
    expect(goBackButton).toBeTruthy();

    fireEvent.press(goBackButton);

    await waitFor(() => {
        const roomCreationFormFirstStepTitleAfterExiting =
            screen.queryByText(/what.*is.*name.*room/i);

        expect(roomCreationFormFirstStepTitleAfterExiting).toBeNull();
    });

    // We expect the screen shown when the form actor does not exist to do not be displayed.
    await waitFor(() => {
        const defaultMtvRoomCreationFormNameScreen = screen.queryByTestId(
            'music-track-vote-creation-form-name-screen-default',
        );

        expect(defaultMtvRoomCreationFormNameScreen).toBeNull();
    });
});
