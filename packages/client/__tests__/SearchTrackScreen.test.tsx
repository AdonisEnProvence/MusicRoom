import React from 'react';
import { render, fireEvent, waitFor } from '../tests/tests-utils';
import { RootNavigator } from '../navigation';
import { NavigationContainer } from '@react-navigation/native';
import { db } from '../tests/data';

function noop() {
    return undefined;
}

test(`Goes to Search a Track screen, searches a track, sees search results, presses a song and listens to it`, async () => {
    const fakeTrack = db.tracks.create();

    const { getByText, getByPlaceholderText, getAllByText, findByText, debug } =
        render(
            <NavigationContainer>
                <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
            </NavigationContainer>,
        );

    expect(getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const searchScreenLink = getByText(/search/i);
    expect(searchScreenLink).toBeTruthy();

    fireEvent.press(searchScreenLink);

    await waitFor(() => expect(getByText(/search.*track/i)).toBeTruthy());

    const searchInput = getByPlaceholderText(/search.*track/i);
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

    await waitFor(() => expect(getByText(/results/i)).toBeTruthy());
    const trackResultListItem = await findByText(fakeTrack.title);
    expect(trackResultListItem).toBeTruthy();
});
