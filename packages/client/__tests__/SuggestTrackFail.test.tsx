import { MtvWorkflowState } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, random } from 'faker';
import React from 'react';
import toast from 'react-native-toast-message';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { db, generateTrackMetadata } from '../tests/data';
import {
    fireEvent,
    noop,
    render,
    waitFor,
    waitForElementToBeRemoved,
    within,
} from '../tests/tests-utils';

test(`A user can suggest tracks to play`, async () => {
    const fakeTrack = db.searchableTracks.create();
    const tracksList = [generateTrackMetadata(), generateTrackMetadata()];

    const roomCreatorUserID = datatype.uuid();
    const initialState: MtvWorkflowState = {
        name: random.words(),
        roomID: datatype.uuid(),
        playing: false,
        roomCreatorUserID,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        delegationOwnerUserID: null,
        timeConstraintIsValid: null,
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

    serverSocket.on('SUGGEST_TRACKS', () => {
        serverSocket.emit('SUGGEST_TRACKS_FAIL_CALLBACK');
    });

    const {
        getAllByText,
        getByText,
        getByTestId,
        findByA11yState,
        findByPlaceholderText,
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

    const tracksTab = within(musicPlayerFullScreen).getByText(/tracks/i);
    expect(tracksTab).toBeTruthy();

    const firstNextTrackToPlay = within(musicPlayerFullScreen).getByText(
        tracksList[1].title,
    );
    expect(firstNextTrackToPlay).toBeTruthy();

    const suggestATrackButton = within(musicPlayerFullScreen).getByLabelText(
        /suggest.*track/i,
    );
    expect(suggestATrackButton).toBeTruthy();

    fireEvent.press(suggestATrackButton);

    const searchTrackTextField = await findByPlaceholderText(/search.*track/i);
    expect(searchTrackTextField).toBeTruthy();

    fireEvent(searchTrackTextField, 'focus');
    fireEvent.changeText(searchTrackTextField, fakeTrack.title.slice(0, 3));
    fireEvent(searchTrackTextField, 'submitEditing');

    await waitFor(() => {
        const resultsPageHeader = getByText(/results/i);
        expect(resultsPageHeader).toBeTruthy();
    });

    const trackToSuggest = getByText(fakeTrack.title);
    expect(trackToSuggest).toBeTruthy();

    fireEvent.press(trackToSuggest);

    await waitForElementToBeRemoved(() => getByText(/results/i));

    expect(toast.show).toHaveBeenNthCalledWith(1, {
        type: 'error',
        text1: 'Track suggestion',
        text2: 'Your suggestion has been rejected',
    });

    const undefinedFakeTrack = within(musicPlayerFullScreen).queryByText(
        fakeTrack.title,
    );
    expect(undefinedFakeTrack).toBeNull();
});
