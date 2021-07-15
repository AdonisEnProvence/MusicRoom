import { NavigationContainer } from '@react-navigation/native';
import { datatype, name, random } from 'faker';
import React from 'react';
import { AppMusicPlayerMachineContext } from '../../types/dist';
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

test.only(`Goes to Search a Track screen, searches a track, sees search results, presses a song and listens to it`, async () => {
    const fakeTrack = db.tracks.create();
    const roomName = random.words();

    serverSocket.on('CREATE_ROOM', (payload, cb) => {
        const state: AppMusicPlayerMachineContext = {
            roomID: datatype.uuid(),
            name: roomName,
            playing: false,
            users: [],
            roomCreatorUserID: datatype.uuid(),
            currentTrack: {
                artistName: random.word(),
                id: datatype.uuid(),
                duration: 42000,
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
        cb({
            ...state,
            tracks: undefined,
            currentTrack: undefined,
        });

        serverSocket.emit('CREATE_ROOM_CALLBACK', state);
    });

    serverSocket.on('ACTION_PAUSE', () => {
        serverSocket.emit('ACTION_PAUSE_CALLBACK');
    });

    serverSocket.on('ACTION_PLAY', () => {
        serverSocket.emit('ACTION_PLAY_CALLBACK');
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

    const musicPlayerMini = getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerRoomName = await within(musicPlayerMini).findByText(
        roomName,
    );
    expect(miniPlayerRoomName).toBeTruthy();

    fireEvent.press(miniPlayerRoomName);

    const musicPlayerFullScreen = await findByA11yState({ expanded: true });
    expect(musicPlayerFullScreen).toBeTruthy();
    expect(
        within(musicPlayerFullScreen).getByText(fakeTrack.title),
    ).toBeTruthy();

    const playButton = within(musicPlayerFullScreen).getByLabelText(
        /play.*video/i,
    );
    expect(playButton).toBeTruthy();
    const zeroCurrentTime = within(musicPlayerFullScreen).getByLabelText(
        /elapsed/i,
    );
    expect(zeroCurrentTime).toBeTruthy();
    expect(zeroCurrentTime).toHaveTextContent('00:00');
    const durationTime = within(musicPlayerFullScreen).getByLabelText(
        /duration/i,
    );
    expect(durationTime).toBeTruthy();
    expect(durationTime).not.toHaveTextContent('00:00');

    fireEvent.press(playButton);

    await waitForTimeout(1_000);

    const pauseButton = await within(musicPlayerFullScreen).findByLabelText(
        /pause.*video/i,
    );
    expect(pauseButton).toBeTruthy();
    const nonZeroCurrentTime = within(musicPlayerFullScreen).getByLabelText(
        /elapsed/i,
    );
    expect(nonZeroCurrentTime).toBeTruthy();
    expect(nonZeroCurrentTime).not.toHaveTextContent('00:00');
});
