import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { db } from '../tests/data';
import { fireEvent, noop, render, waitFor } from '../tests/tests-utils';

test('SearchTracksScreen is dismissed when pressing on a track card', async () => {
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

    // This operation can take some time.
    // It's not crucial that it occurs immediately.
    // We just want the results screen to be dismissed after some time.
    await waitFor(
        () => {
            const searchTracksResultsTitle = screen.queryByText(/results/i);
            expect(searchTracksResultsTitle).toBeNull();
        },
        {
            timeout: 10_000,
        },
    );

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

test('SearchTracksScreen is reset when going back to it', async () => {
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
        const roomCreationFormFirstStepTitle =
            screen.queryByText(/what.*is.*name.*room/i);

        expect(roomCreationFormFirstStepTitle).toBeNull();
    });

    fireEvent.press(searchScreenLink);

    await waitFor(() => {
        expect(screen.getByText(/search.*track/i)).toBeTruthy();
    });

    await waitFor(() => {
        expect(searchInput).toHaveProp('value', '');
    });
});
