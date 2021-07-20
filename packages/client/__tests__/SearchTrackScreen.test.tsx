import { NavigationContainer } from '@react-navigation/native';
import { datatype, name, random } from 'faker';
import React from 'react';
import { AppMusicPlayerMachineContext } from '../machines/appMusicPlayerMachine';
import { RootNavigator } from '../navigation';
import { serverSocket } from '../services/websockets';
import { db } from '../tests/data';
import { fireEvent, render, waitFor, within } from '../tests/tests-utils';

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

test(`Goes to Search a Track screen, searches a track, sees search results, presses a song and listens to it`, async () => {
    const fakeTrack = db.tracks.create();
    const roomName = random.words();
    const state: AppMusicPlayerMachineContext = {
        roomID: datatype.uuid(),
        name: roomName,
        playing: false,
        users: [],
        tracksIDsList: null,
        roomCreatorUserID: datatype.uuid(),
        currentTrack: {
            artistName: random.word(),
            id: datatype.uuid(),
            duration: 158000,
            elapsed: 0,
            title: fakeTrack.title,
        },
        tracks: [
            {
                id: datatype.uuid(),
                artistName: name.findName(),
                duration: 42000,
                title: random.words(3),
            },
        ],
    };

    serverSocket.on('CREATE_ROOM', () => {
        serverSocket.emit('CREATE_ROOM_SYNCHED_CALLBACK', {
            ...state,
            tracks: null,
            currentTrack: null,
        });
    });

    serverSocket.on('ACTION_PAUSE', () => {
        serverSocket.emit('ACTION_PAUSE_CALLBACK');
    });

    serverSocket.on('ACTION_PLAY', () => {
        serverSocket.emit('ACTION_PLAY_CALLBACK', state);
    });

    const {
        getByText,
        getByPlaceholderText,
        getAllByText,
        findByText,
        getByTestId,
        findByA11yState,
    } = render(
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

    fireEvent.press(trackResultListItem);

    /**
     * Check that room is not ready
     * And button disabled
     */

    const musicPlayerMini = getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerRoomName = await within(musicPlayerMini).findByText(
        roomName,
    );
    expect(miniPlayerRoomName).toBeTruthy();

    const miniPlayerPlayButton =
        within(musicPlayerMini).getByLabelText(/play.*video/i);
    expect(miniPlayerPlayButton).toBeTruthy();
    expect(miniPlayerPlayButton).toBeDisabled();

    fireEvent.press(miniPlayerRoomName);

    await waitForTimeout(1_000);

    const musicPlayerFullScreen = await findByA11yState({ expanded: true });
    expect(musicPlayerFullScreen).toBeTruthy();

    const playButton = within(musicPlayerFullScreen).getByLabelText(
        /play.*video/i,
    );
    expect(playButton).toBeTruthy();
    expect(playButton).toBeDisabled();

    serverSocket.emit('CREATE_ROOM_CALLBACK', state);
    await waitForTimeout(1_000);

    fireEvent.press(playButton);
    await waitForTimeout(1_000);

    expect(
        within(musicPlayerFullScreen).getByText(fakeTrack.title),
    ).toBeTruthy();

    const pauseButton = await within(musicPlayerFullScreen).findByLabelText(
        /pause.*video/i,
    );
    expect(pauseButton).toBeTruthy();
    expect(pauseButton).toBeEnabled();

    const nonZeroCurrentTime = within(musicPlayerFullScreen).getByLabelText(
        /elapsed/i,
    );
    expect(nonZeroCurrentTime).toBeTruthy();
    expect(nonZeroCurrentTime).not.toHaveTextContent('00:00');

    const durationTime = within(musicPlayerFullScreen).getByLabelText(
        /.*minutes duration/i,
    );
    expect(durationTime).toBeTruthy();
    expect(durationTime).not.toHaveTextContent('00:00');
});
