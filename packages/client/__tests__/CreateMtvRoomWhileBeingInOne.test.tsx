import { MtvWorkflowState, UserDevice } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, random } from 'faker';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata, db } from '../tests/data';
import { fireEvent, noop, render, waitFor, within } from '../tests/tests-utils';

test(`Device should still be playing while entering the mtvRoomCreation form while already being in a room`, async () => {
    const fakeTrack = db.searchableTracks.create();
    const tracksList = [generateTrackMetadata(), generateTrackMetadata()];
    const thisDevice = {
        deviceID: datatype.uuid(),
        name: random.word(),
    };
    const userID = datatype.uuid();
    const state: MtvWorkflowState = {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: true,
        usersLength: 1,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userFitsPositionConstraint: null,
            userHasBeenInvited: false,
            emittingDeviceID: thisDevice.deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        tracks: tracksList.slice(1),
        roomCreatorUserID: userID,
        minimumScoreToBePlayed: 1,
    };

    serverSocket.on('GET_CONNECTED_DEVICES_AND_DEVICE_ID', (cb) => {
        cb({
            currDeviceID: thisDevice.deviceID,
            devices: [
                {
                    deviceID: thisDevice.deviceID,
                    name: 'thisDevice',
                },
            ],
        });
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

    serverSocket.emit('RETRIEVE_CONTEXT', state);

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
        new RegExp(`${tracksList[0].title}.*${tracksList[0].artistName}`),
    );
    expect(miniPlayerTrackTitle).toBeTruthy();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    expect(
        screen.getByTestId('music-player-playing-device-emitting'),
    ).toBeTruthy();

    //Search steps
    const searchScreenLink = screen.getByText(/^search$/i);
    expect(searchScreenLink).toBeTruthy();

    fireEvent.press(searchScreenLink);

    await waitFor(() =>
        expect(screen.getByText(/search.*track/i)).toBeTruthy(),
    );

    const searchInput = await screen.findByPlaceholderText(/search.*track/i);
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

    const trackResultListItem = await screen.findByText(fakeTrack.title);
    expect(trackResultListItem).toBeTruthy();

    fireEvent.press(trackResultListItem);

    await waitFor(() => {
        const roomCreationFormFirstStepTitle =
            screen.getByText(/what.*is.*name.*room/i);
        expect(roomCreationFormFirstStepTitle).toBeTruthy();
    });

    expect(
        screen.getByTestId('music-player-playing-device-emitting'),
    ).toBeTruthy();
});
