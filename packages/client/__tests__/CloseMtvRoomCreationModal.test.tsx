import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { db } from '../tests/data';
import { fireEvent, noop, render, waitFor } from '../tests/tests-utils';

test('MtvRoom creation form modal can be closed', async () => {
    const fakeTrack = db.searchableTracks.create();

    const screen = render(
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                isReadyRef.current = true;
            }}
        >
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const searchScreenLink = screen.getByText(/^search$/i);
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

    await waitFor(() => expect(screen.getByText(/results/i)).toBeTruthy());

    const trackResultListItem = await screen.findByText(fakeTrack.title);
    expect(trackResultListItem).toBeTruthy();

    fireEvent.press(trackResultListItem);

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
