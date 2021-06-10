import React from 'react';
import { render, fireEvent, waitFor } from '../tests/tests-utils';
import { RootNavigator } from '../navigation';
import { NavigationContainer } from '@react-navigation/native';

function noop() {
    return undefined;
}

test(`Let's user search for a song, shows the results and let's the user click on a song, that redirects them to results screen`, async () => {
    const { getByText, getByPlaceholderText } = render(
        <NavigationContainer>
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    expect(getByText(/this.*is.*home/i)).toBeTruthy();

    const searchScreenLink = getByText(/search/i);
    expect(searchScreenLink).toBeTruthy();

    fireEvent.press(searchScreenLink);
    await waitFor(() => expect(getByText(/search.*track/i)).toBeTruthy());

    const searchInput = getByPlaceholderText(/search.*track/i);
    expect(searchInput).toBeTruthy();

    const SEARCH_QUERY = 'Benjamin Biolay';

    fireEvent.changeText(searchInput, SEARCH_QUERY);
    fireEvent(searchInput, 'submitEditing');
});
