import { MtvWorkflowState, UserDevice } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, random } from 'faker';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import { fireEvent, noop, render, within } from '../tests/tests-utils';

test(`
    After the client receives a USER_LENGTH_UPDATE we expect the player to display
    2 current listeners
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
        playingMode: 'BROADCAST',
        usersLength: 1,
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userHasBeenInvited: false,
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

    const { getByTestId, findByA11yState } = render(
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

    const listernersElement = await within(musicPlayerFullScreen).findByText(
        /2 listeners/i,
    );
    expect(listernersElement).toBeTruthy();
});
