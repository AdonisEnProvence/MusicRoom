import { NavigationContainer } from '@react-navigation/native';
import { datatype, random } from 'faker';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { db } from '../tests/data';
import { fireEvent, render, within } from '../tests/tests-utils';

function noop() {
    return undefined;
}

test(`When the user clicks on next track button, it should play the next track, if there is one`, async () => {
    const tracksList = [db.tracksMetadata.create(), db.tracksMetadata.create()];

    const { getAllByText, getByTestId, findByA11yState } = render(
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                isReadyRef.current = true;
            }}
        >
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    const roomCreatorUserID = datatype.uuid();
    serverSocket.emit('RETRIEVE_CONTEXT', {
        context: {
            name: random.words(),
            roomID: datatype.uuid(),
            playing: false,
            roomCreatorUserID,
            users: [roomCreatorUserID],
            currentTrack: {
                ...tracksList[0],
                elapsed: 0,
            },
            tracks: [],
            tracksIDsList: null,
            waitingRoomID: undefined,
        },
    });

    /**
     * Firstly expecting to be on the home
     * And then click on GO TO MUSIC TRACK VOTE button
     */
    expect(getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const musicPlayerMini = getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
        `${tracksList[0].title} • ${tracksList[0].artistName}`,
    );
    expect(miniPlayerTrackTitle).toBeTruthy();

    fireEvent.press(miniPlayerTrackTitle);

    const musicPlayerFullScreen = await findByA11yState({ expanded: true });
    expect(musicPlayerFullScreen).toBeTruthy();
    expect(
        within(musicPlayerFullScreen).getByText(tracksList[0].title),
    ).toBeTruthy();

    const nextTrackButton = within(musicPlayerFullScreen).getByLabelText(
        /play.*next.*track/i,
    );
    expect(nextTrackButton).toBeTruthy();

    fireEvent.press(nextTrackButton);
});
