import { MtvWorkflowState, UserDevice } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, name, random } from 'faker';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { fireEvent, render, within } from '../tests/tests-utils';

function noop() {
    return undefined;
}

//NOTE listing the user connected devices in the MTV room chat section is temporary, we will later have to update this test
test(`
On userMachine mounting it should retrieve user connected devices and list them in the MTV chat section
After clicking on one not emitting it should set the clicked one as emitting
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
        userRelatedInformation: {
            emittingDeviceID: thisDevice.deviceID,
            userID,
        },
        currentTrack: null,
        roomCreatorUserID: userID,
        tracks: [
            {
                id: datatype.uuid(),
                artistName: name.findName(),
                duration: 42000,
                title: random.words(3),
                score: datatype.number(),
            },
        ],
        suggestedTracks: null,
    };

    serverSocket.on('GET_CONNECTED_DEVICES_AND_DEVICE_ID', (cb) => {
        cb({
            currDeviceID: thisDevice.deviceID,
            devices: userDevices,
        });
    });

    serverSocket.on('CHANGE_EMITTING_DEVICE', ({ newEmittingDeviceID }) => {
        serverSocket.emit('CHANGE_EMITTING_DEVICE_CALLBACK', {
            ...state,
            userRelatedInformation: {
                ...state.userRelatedInformation!,
                emittingDeviceID: newEmittingDeviceID,
            },
        });
    });

    const { findByText, getByTestId, getByText, findByA11yState } = render(
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
     * Toggle Chat tab
     * And Search for listed user devices
     */

    const goChatButton = within(musicPlayerFullScreen).getByText(/Chat/i);
    expect(goChatButton).toBeTruthy();
    fireEvent.press(goChatButton);

    expect(await findByText(/Welcome.*Chat/i)).toBeTruthy();

    expect(
        getByText(new RegExp(`${userDevices.length} connected devices`)),
    ).toBeTruthy();

    userDevices.forEach((device) => {
        const isEmittingDevice =
            state.userRelatedInformation?.emittingDeviceID === device.deviceID;
        let expectedDeviceName = device.name;

        if (isEmittingDevice) expectedDeviceName += ' EMITTING';

        const listedMatchingDevice = within(musicPlayerFullScreen).getByText(
            new RegExp(expectedDeviceName),
        );

        expect(listedMatchingDevice).toBeTruthy();
    });

    /**
     * Press on a not emitting device
     * It should then become the emitting one
     */

    const lastDevice = userDevices.slice(-1)[0];
    const lastDeviceElement = within(musicPlayerFullScreen).getByText(
        new RegExp(lastDevice.name),
    );
    expect(lastDeviceElement).toBeTruthy();

    fireEvent.press(lastDeviceElement);

    expect(
        await within(musicPlayerFullScreen).findByText(
            new RegExp(lastDevice.name + ' EMITTING'),
        ),
    ).toBeTruthy();
});
