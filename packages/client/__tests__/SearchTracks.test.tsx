import { db } from '../tests/data';
import {
    findBottomBarSearchButton,
    fireEvent,
    renderApp,
    waitFor,
    waitForElementToBeRemoved,
} from '../tests/tests-utils';

test('SearchTracksScreen is dismissed when pressing on a track card', async () => {
    const fakeTrack = db.searchableTracks.create();

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const searchScreenLink = await findBottomBarSearchButton({ screen });
    expect(searchScreenLink).toBeTruthy();

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

    const trackResultListItem = await waitFor(() => {
        const trackResultListItem = screen.getByText(fakeTrack.title);
        expect(trackResultListItem).toBeTruthy();

        return trackResultListItem;
    });
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
        const roomCreationFormFirstStepTitle =
            screen.queryByText(/what.*is.*name.*room/i);

        expect(roomCreationFormFirstStepTitle).toBeNull();
    });
});

test('SearchTracksScreen keeps its state when going back to it', async () => {
    const fakeTrack = db.searchableTracks.create();

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const searchScreenLink = await findBottomBarSearchButton({ screen });
    expect(searchScreenLink).toBeTruthy();

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

    const trackResultListItem = await waitFor(() => {
        const trackResultListItem = screen.getByText(fakeTrack.title);
        expect(trackResultListItem).toBeTruthy();

        return trackResultListItem;
    });

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
        const roomCreationFormFirstStepTitle =
            screen.queryByText(/what.*is.*name.*room/i);

        expect(roomCreationFormFirstStepTitle).toBeNull();
    });

    fireEvent.press(searchScreenLink);

    await waitFor(() => {
        expect(screen.getByText(/search.*track/i)).toBeTruthy();
    });

    await waitFor(() => {
        expect(searchInput).toHaveProp('value', SEARCH_QUERY);
    });
});

test('SearchTracksScreen results are reset when pressing clear button', async () => {
    const fakeTrack = db.searchableTracks.create();

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const searchScreenLink = await findBottomBarSearchButton({ screen });
    expect(searchScreenLink).toBeTruthy();

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

    const trackResultListItem = await waitFor(() => {
        const trackResultListItem = screen.getByText(fakeTrack.title);
        expect(trackResultListItem).toBeTruthy();

        return trackResultListItem;
    });
    expect(trackResultListItem).toBeTruthy();

    const waitForTrackResultListItemToDisappearPromise =
        waitForElementToBeRemoved(() => screen.getByText(fakeTrack.title));

    const clearInputButton = screen.getByLabelText(/clear.*search.*input/i);
    expect(clearInputButton).toBeTruthy();

    fireEvent.press(clearInputButton);

    await waitForTrackResultListItemToDisappearPromise;

    await waitFor(() => {
        expect(searchInput).toHaveProp('value', '');
    });
});

test('SearchTracksScreen results are reset when pressing cancel button', async () => {
    const fakeTrack = db.searchableTracks.create();

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const searchScreenLink = await findBottomBarSearchButton({ screen });
    expect(searchScreenLink).toBeTruthy();

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

    const trackResultListItem = await waitFor(() => {
        const trackResultListItem = screen.getByText(fakeTrack.title);
        expect(trackResultListItem).toBeTruthy();

        return trackResultListItem;
    });
    expect(trackResultListItem).toBeTruthy();

    const waitForTrackResultListItemToDisappearPromise =
        waitForElementToBeRemoved(() => screen.getByText(fakeTrack.title));

    //Need to determine why this needs to be the first element ?
    const firstCancelButton = screen.getAllByText(/cancel/i)[0];
    expect(firstCancelButton).toBeTruthy();

    fireEvent.press(firstCancelButton);

    await waitForTrackResultListItemToDisappearPromise;

    await waitFor(() => {
        expect(searchInput).toHaveProp('value', '');
    });
});
