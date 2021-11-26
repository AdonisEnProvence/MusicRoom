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
        playingMode: 'BROADCAST',
        roomCreatorUserID,
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userHasBeenInvited: false,
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

    serverSocket.on('SUGGEST_TRACKS', ({ tracksToSuggest }) => {
        if (initialState.tracks === null) {
            initialState.tracks = [];
        }

        tracksToSuggest.forEach((suggestedTrackID) => {
            if (initialState.tracks === null) {
                throw new Error('initialState.tracks is null');
            }

            const duplicateTrackIndex = initialState.tracks.findIndex(
                (track) => track.id === suggestedTrackID,
            );
            const isDuplicate = duplicateTrackIndex !== -1;

            if (isDuplicate) {
                initialState.tracks[duplicateTrackIndex].score++;

                return;
            }

            const suggestedTrackInformation = db.searchableTracks.findFirst({
                where: { id: { equals: suggestedTrackID } },
            });
            if (suggestedTrackInformation === null) {
                throw new Error(
                    `Could not find a track with this id (${suggestedTrackID}) in tracks database. Check that you called db.searchableTracks.create().`,
                );
            }

            initialState.tracks.push({
                id: suggestedTrackID,
                title: suggestedTrackInformation.title,
                artistName: suggestedTrackInformation.artistName,
                duration: suggestedTrackInformation.duration,
                score: 1,
            });
        });

        serverSocket.emit('VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE', initialState);
        serverSocket.emit('SUGGEST_TRACKS_CALLBACK');
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
        type: 'success',
        text1: 'Track suggestion',
        text2: 'Your suggestion has been accepted',
    });
    const suggestedTrack = await within(musicPlayerFullScreen).findByText(
        fakeTrack.title,
    );
    expect(suggestedTrack).toBeTruthy();
});

test('Search query can be changed and submitted after a first submission', async () => {
    const fakeTracks = [
        db.searchableTracks.create({
            title: 'Vendredi 12',
        }),
        db.searchableTracks.create({
            title: 'Commen une voiture volée',
        }),
    ];
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
            userHasBeenInvited: false,
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

    const searchTrackTextField = await screen.findByPlaceholderText(
        /search.*track/i,
    );
    expect(searchTrackTextField).toBeTruthy();

    // Suggest first track
    fireEvent(searchTrackTextField, 'focus');
    fireEvent.changeText(searchTrackTextField, fakeTracks[0].title.slice(0, 3));
    fireEvent(searchTrackTextField, 'submitEditing');

    await waitFor(() => {
        const resultsPageHeader = screen.getByText(/results/i);
        expect(resultsPageHeader).toBeTruthy();
    });

    const firstTrackToSuggest = screen.getByText(fakeTracks[0].title);
    expect(firstTrackToSuggest).toBeTruthy();

    const waitForResultsToDisappearPromise = waitForElementToBeRemoved(() =>
        screen.getByText(/results/i),
    );

    const goBackButtons = screen.getAllByLabelText(/go.*back/i);
    const goBackToSearchInputButton = goBackButtons[goBackButtons.length - 1];
    expect(goBackToSearchInputButton).toBeTruthy();

    fireEvent.press(goBackToSearchInputButton);

    await waitForResultsToDisappearPromise;

    // Suggest second track
    fireEvent(searchTrackTextField, 'focus');
    fireEvent.changeText(searchTrackTextField, fakeTracks[1].title.slice(0, 3));
    fireEvent(searchTrackTextField, 'submitEditing');

    await waitFor(() => {
        const resultsPageHeader = screen.getByText(/results/i);
        expect(resultsPageHeader).toBeTruthy();
    });

    const secondTrackToSuggest = screen.getByText(fakeTracks[1].title);
    expect(secondTrackToSuggest).toBeTruthy();
});
