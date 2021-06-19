import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { fireEvent, render } from '../tests/tests-utils';

function noop() {
    return undefined;
}

function waitForTimeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

test(`On FORCED_DISCONNECTION it should displays the alert modal and dismiss it when clicking on dismiss button`, async () => {
    const {
        getByText,
        getByPlaceholderText,
        getAllByText,
        findByText,
        getByTestId,
        findByA11yState,
        debug,
    } = render(
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                isReadyRef.current = true;
            }}
        >
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    /**
     * Retrieve context to have the appMusicPlayerMachine directly
     * in state connectedToRoom
     */
    serverSocket.emit('RETRIEVE_CONTEXT', {
        context: {
            currentRoom: {
                roomID: 'RoomA_ID',
                name: 'RoomA',
            },
            currentTrack: {
                artistName: 'ArtistNameA',
                name: 'TrackA',
            },
            waitingRoomID: undefined,

            currentTrackDuration: 42,
            currentTrackElapsedTime: 21,
        },
    });

    /**
     * Firstly expecting to be on the home
     * And then click on GO TO MUSIC TRACK VOTE button
     */
    expect(getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
    const goToMusicTrackVoteButton = await findByText(
        /GO TO MUSIC TRACK VOTE/i,
    );
    expect(goToMusicTrackVoteButton).toBeTruthy();
    fireEvent.press(goToMusicTrackVoteButton);
    expect(getAllByText(/Track Vote/i)).toBeTruthy();

    serverSocket.emit('FORCED_DISCONNECTION');

    /**
     * After FORCED_DISCONNECTION we expect the user to be on the Alert screen
     */
    const dismissButton = await findByText(/DISMISS/i);
    expect(dismissButton).toBeTruthy();
    expect(await getByText(/FORCED_DISCONNECTION/i)).toBeTruthy();

    /**
     * By clicking on the dismiss button the user should see the home
     */
    fireEvent.press(dismissButton);
    expect(getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
});
