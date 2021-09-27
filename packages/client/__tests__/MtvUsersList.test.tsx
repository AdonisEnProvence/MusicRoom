import { MtvWorkflowState } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, random } from 'faker';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import { fireEvent, noop, render, waitFor, within } from '../tests/tests-utils';

test(`A user can suggest tracks to play`, async () => {
    const tracksList = [generateTrackMetadata(), generateTrackMetadata()];

    const roomCreatorUserID = datatype.uuid();
    const initialState: MtvWorkflowState = {
        name: random.words(),
        roomID: datatype.uuid(),
        playing: false,
        playingMode: 'BROADCAST',
        roomCreatorUserID,
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userFitsPositionConstraint: null,
            emittingDeviceID: datatype.uuid(),
            userID: roomCreatorUserID,
            tracksVotedFor: [],
        },
        usersLength: 1,
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        tracks: tracksList.slice(1),
        minimumScoreToBePlayed: 1,
    };

    serverSocket.on('GET_CONTEXT', () => {
        serverSocket.emit('RETRIEVE_CONTEXT', initialState);
    });

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

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
        `${tracksList[0].title} • ${tracksList[0].artistName}`,
    );
    expect(miniPlayerTrackTitle).toBeTruthy();

    fireEvent.press(miniPlayerTrackTitle);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();
    expect(
        within(musicPlayerFullScreen).getByText(tracksList[0].title),
    ).toBeTruthy();

    const listenersButton = await screen.getByText(/listeners/i);
    expect(listenersButton).toBeTruthy();

    fireEvent.press(listenersButton);

    await waitFor(() => {
        const usersListScreen = screen.getByText(/users.*list/i);
        expect(usersListScreen).toBeTruthy();
    });

    const USER_TO_SELECT_USERNAME = 'Biolay';
    const userListItem = screen.getByText(USER_TO_SELECT_USERNAME);
    expect(userListItem).toBeTruthy();
    const openUserSettingsButton = screen.getByA11yLabel(
        new RegExp(`open.*${USER_TO_SELECT_USERNAME}.*settings`, 'i'),
    );
    expect(openUserSettingsButton).toBeTruthy();

    fireEvent.press(openUserSettingsButton);

    await waitFor(() => {
        const bottomSheetModalTitle = screen.getByText(
            new RegExp(`${USER_TO_SELECT_USERNAME}.*settings`, 'i'),
        );
        expect(bottomSheetModalTitle).toBeTruthy();
    });
    const delegationAndControlSwitch = screen.getByA11yLabel(
        /delegation.*control.*permission/i,
    );
    expect(delegationAndControlSwitch).toBeTruthy();
    const makeDelegatorButton = screen.getByText(/make.*delegator/i);
    expect(makeDelegatorButton).toBeTruthy();
});
