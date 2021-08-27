import { NavigationContainer } from '@react-navigation/native';
import { datatype, name, random } from 'faker';
import React from 'react';
import { UserDevice } from '../../types/dist';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import {
    fireEvent,
    render,
    waitForTimeout,
    within,
} from '../tests/tests-utils';

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
    const state = {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: false,
        usersLength: 1,
        userRelatedInformation: {
            emittingDeviceID: thisDevice.deviceID,
            userID,
        },
        currentTrack: null,
        tracksIDsList: null,
        roomCreatorUserID: userID,
        tracks: [
            {
                id: datatype.uuid(),
                artistName: name.findName(),
                duration: 42000,
                title: random.words(3),
            },
        ],
    };

    const { debug, getByTestId, getAllByText, findByA11yState } = render(
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
     * Emit a server USER_LENGTH_UPDATE socket event
     * And check for it's receiption
     */

    serverSocket.emit('USER_LENGTH_UPDATE', {
        ...state,
        usersLength: state.usersLength + 1,
    });
    await waitForTimeout(1000);

    expect(
        within(musicPlayerFullScreen).getByText(/2 listeners/i),
    ).toBeTruthy();
});
