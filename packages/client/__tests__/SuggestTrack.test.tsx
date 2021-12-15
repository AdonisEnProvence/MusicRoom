import { MtvWorkflowState } from '@musicroom/types';
import { datatype, random } from 'faker';
import toast from 'react-native-toast-message';
import { serverSocket } from '../services/websockets';
import { db, generateTrackMetadata } from '../tests/data';
import {
    fireEvent,
    renderApp,
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

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    serverSocket.on('MTV_SUGGEST_TRACKS', ({ tracksToSuggest }) => {
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

        serverSocket.emit(
            'MTV_VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
            initialState,
        );
        serverSocket.emit('MTV_SUGGEST_TRACKS_CALLBACK');
    });

    const screen = await renderApp();

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

    fireEvent(searchTrackTextField, 'focus');
    fireEvent.changeText(searchTrackTextField, fakeTrack.title.slice(0, 3));
    fireEvent(searchTrackTextField, 'submitEditing');

    const trackToSuggest = await screen.findByText(fakeTrack.title);
    expect(trackToSuggest).toBeTruthy();

    const waitForSuggestTrackInputToDisappearPromise =
        waitForElementToBeRemoved(() =>
            screen.getByPlaceholderText(/search.*track/i),
        );

    fireEvent.press(trackToSuggest);

    await waitForSuggestTrackInputToDisappearPromise;

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

test('Suggested tracks are reset when pressing clear button', async () => {
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

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    const screen = await renderApp();

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

    const firstTrackToSuggest = await screen.findByText(fakeTracks[0].title);
    expect(firstTrackToSuggest).toBeTruthy();

    const waitForTrackResultListItemToDisappearPromise =
        waitForElementToBeRemoved(() => screen.getByText(fakeTracks[0].title));

    const clearInputButton = screen.getByLabelText(/clear.*search.*input/i);
    expect(clearInputButton).toBeTruthy();

    fireEvent.press(clearInputButton);

    await waitForTrackResultListItemToDisappearPromise;

    await waitFor(() => {
        expect(searchTrackTextField).toHaveProp('value', '');
    });
});

test('Suggested tracks are reset when pressing cancel button', async () => {
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

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    const screen = await renderApp();

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

    const firstTrackToSuggest = await screen.findByText(fakeTracks[0].title);
    expect(firstTrackToSuggest).toBeTruthy();

    const waitForTrackResultListItemToDisappearPromise =
        waitForElementToBeRemoved(() => screen.getByText(fakeTracks[0].title));

    const cancelButton = screen.getByText(/cancel/i);
    expect(cancelButton).toBeTruthy();

    fireEvent.press(cancelButton);

    await waitForTrackResultListItemToDisappearPromise;

    await waitFor(() => {
        expect(searchTrackTextField).toHaveProp('value', '');
    });
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

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    const screen = await renderApp();

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

    const firstTrackToSuggest = await screen.findByText(fakeTracks[0].title);
    expect(firstTrackToSuggest).toBeTruthy();

    // Suggest second track
    fireEvent(searchTrackTextField, 'focus');
    fireEvent.changeText(searchTrackTextField, fakeTracks[1].title.slice(0, 3));
    fireEvent(searchTrackTextField, 'submitEditing');

    const secondTrackToSuggest = await screen.findByText(fakeTracks[1].title);
    expect(secondTrackToSuggest).toBeTruthy();
});

test('Display a failure toast when track could not be suggested', async () => {
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
            userHasBeenInvited: false,
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

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    serverSocket.on('MTV_SUGGEST_TRACKS', () => {
        serverSocket.emit('MTV_SUGGEST_TRACKS_FAIL_CALLBACK');
    });

    const screen = await renderApp();

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

    fireEvent(searchTrackTextField, 'focus');
    fireEvent.changeText(searchTrackTextField, fakeTrack.title.slice(0, 3));
    fireEvent(searchTrackTextField, 'submitEditing');

    const trackToSuggest = await screen.findByText(fakeTrack.title);
    expect(trackToSuggest).toBeTruthy();

    const waitForSuggestTrackInputToDisappearPromise =
        waitForElementToBeRemoved(() =>
            screen.getByPlaceholderText(/search.*track/i),
        );

    fireEvent.press(trackToSuggest);

    await waitForSuggestTrackInputToDisappearPromise;

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
