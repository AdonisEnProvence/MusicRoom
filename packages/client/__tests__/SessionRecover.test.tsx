import { NavigationContainer } from '@react-navigation/native';
import { datatype, name, random } from 'faker';
import React from 'react';
import { MtvWorkflowState } from '../../types/dist';
import { RootNavigator } from '../navigation';
import { serverSocket } from '../services/websockets';
import { db } from '../tests/data';
import { fireEvent, render, within } from '../tests/tests-utils';

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

test(`It should display the music player corresponding to the injected state on both CREATED_ROOM server socket callbacks`, async () => {
    const fakeTrack = db.tracks.create();
    const roomName = random.words();
    const state: MtvWorkflowState = {
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

    const { getAllByText, getByTestId, findByA11yState } = render(
        <NavigationContainer>
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    expect(getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    /**
     * Check that room is not ready
     * And button disabled
     */

    serverSocket.emit('CREATE_ROOM_SYNCHED_CALLBACK', {
        ...state,
        tracks: null,
        currentTrack: null,
    });

    await waitForTimeout(1_000);

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

    expect(
        within(musicPlayerFullScreen).getByText(fakeTrack.title),
    ).toBeTruthy();

    const pauseButton = await within(musicPlayerFullScreen).findByLabelText(
        /play.*video/i,
    );
    expect(pauseButton).toBeTruthy();
    expect(pauseButton).toBeEnabled();
});

test(`It should display the music player corresponding to the injected state on both RETRIEVE_CONTEXT server socket event`, async () => {
    const fakeTrack = db.tracks.create();
    const roomName = random.words();
    const state: MtvWorkflowState = {
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

    const { getAllByText, getByTestId, findByA11yState } = render(
        <NavigationContainer>
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    expect(getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    /**
     * Check that room is not ready
     * And button disabled
     */

    serverSocket.emit('RETRIEVE_CONTEXT', state);

    await waitForTimeout(1_000);

    const musicPlayerMini = getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerRoomName = await within(musicPlayerMini).findByText(
        roomName,
    );
    expect(miniPlayerRoomName).toBeTruthy();

    const miniPlayerPlayButton =
        within(musicPlayerMini).getByLabelText(/play.*video/i);
    expect(miniPlayerPlayButton).toBeTruthy();
    expect(miniPlayerPlayButton).toBeEnabled();

    fireEvent.press(miniPlayerRoomName);

    await waitForTimeout(1_000);

    const musicPlayerFullScreen = await findByA11yState({ expanded: true });
    expect(musicPlayerFullScreen).toBeTruthy();

    const playButton = within(musicPlayerFullScreen).getByLabelText(
        /play.*video/i,
    );
    expect(playButton).toBeTruthy();
    expect(playButton).toBeEnabled();

    expect(
        within(musicPlayerFullScreen).getByText(fakeTrack.title),
    ).toBeTruthy();
});

test(`It should display the already elapsed track duration and player should be playing`, async () => {
    const fakeTrack = db.tracks.create();
    const roomName = random.words();
    const state: MtvWorkflowState = {
        roomID: datatype.uuid(),
        name: roomName,
        playing: true,
        users: [],
        tracksIDsList: null,
        roomCreatorUserID: datatype.uuid(),
        currentTrack: {
            artistName: random.word(),
            id: datatype.uuid(),
            duration: 158000,
            elapsed: 100000,
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

    const { getAllByText, getByTestId, findByA11yState, debug } = render(
        <NavigationContainer>
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    expect(getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    serverSocket.emit('RETRIEVE_CONTEXT', state);

    await waitForTimeout(1_000);
    await waitForTimeout(1_000);

    const musicPlayerMini = getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerRoomName = await within(musicPlayerMini).findByText(
        roomName,
    );
    expect(miniPlayerRoomName).toBeTruthy();

    // const miniPlayerPlayButton =
    //     within(musicPlayerMini).getByLabelText(/pause.*video/i);
    // expect(miniPlayerPlayButton).toBeTruthy();
    // expect(miniPlayerPlayButton).toBeEnabled();

    fireEvent.press(miniPlayerRoomName);

    await waitForTimeout(1_000);

    const musicPlayerFullScreen = await findByA11yState({ expanded: true });
    expect(musicPlayerFullScreen).toBeTruthy();

    expect(
        within(musicPlayerFullScreen).getByText(fakeTrack.title),
    ).toBeTruthy();

    const nonZeroCurrentTime = within(musicPlayerFullScreen).getByLabelText(
        /elapsed/i,
    );
    expect(nonZeroCurrentTime).toBeTruthy();
    expect(nonZeroCurrentTime).toHaveTextContent('01:40');

    debug();
    const playButton = within(musicPlayerFullScreen).getByLabelText(
        /pause.*video/i,
    );
    expect(playButton).toBeTruthy();
    expect(playButton).toBeEnabled();
});
