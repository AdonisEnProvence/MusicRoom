import { MtvWorkflowState, UserDevice } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, random } from 'faker';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import { fireEvent, render, waitFor, within } from '../tests/tests-utils';

function noop() {
    return undefined;
}

test(`
User should go to the musicPlayer into the settings tab an hit the leave button
He will be redirected to the home and will view the default mini music player
`, async () => {
    const userDevices: UserDevice[] = Array.from({ length: 3 }).map(() => ({
        deviceID: datatype.uuid(),
        name: random.word(),
    }));
    const thisDevice = userDevices[0];
    const userID = datatype.uuid();
    const state: MtvWorkflowState = {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: false,
        usersLength: 1,
        playingMode: 'BROADCAST',
        roomHasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        userRelatedInformation: {
            userFitsPositionConstraint: null,
            emittingDeviceID: thisDevice.deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: null,
        roomCreatorUserID: userID,
        tracks: [generateTrackMetadata()],
        minimumScoreToBePlayed: 1,
    };

    let leaveRoomServerListenerHasBeenCalled = false;
    serverSocket.on('LEAVE_ROOM', () => {
        leaveRoomServerListenerHasBeenCalled = true;
    });

    const {
        findByText,
        getByTestId,
        getAllByText,
        findByA11yState,
        queryAllByA11yState,
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
     * And toggle mtv room full screen
     */

    serverSocket.emit('RETRIEVE_CONTEXT', state);

    const musicPlayerMini = getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    fireEvent.press(musicPlayerMini);

    const musicPlayerFullScreen = await findByA11yState({ expanded: true });
    expect(musicPlayerFullScreen).toBeTruthy();

    /**
     * Toggle Settings tab
     * And Search for leave room button
     */

    const goSettingsButton = within(musicPlayerFullScreen).getByText(
        /Settings/i,
    );
    expect(goSettingsButton).toBeTruthy();
    fireEvent.press(goSettingsButton);

    expect(await findByText(/settings tab/i)).toBeTruthy();

    /**
     * Press on the leave room button
     */
    const leaveRoomButton = within(musicPlayerFullScreen).getByText(/LEAVE/i);
    expect(leaveRoomButton).toBeTruthy();
    fireEvent.press(leaveRoomButton);

    await waitFor(() => {
        const elements = queryAllByA11yState({ expanded: false });
        expect(elements.length).toBe(0);
    });

    expect(leaveRoomServerListenerHasBeenCalled).toBeTruthy();
    expect(getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
    expect(
        within(musicPlayerMini).getByText(/Join a room to listen to music/i),
    ).toBeTruthy();
});
