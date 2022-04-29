import { MtvWorkflowStateWithUserRelatedInformation } from '@musicroom/types';
import { LocationPermissionResponse, PermissionStatus } from 'expo-location';
import { datatype, random } from 'faker';
import {
    getCurrentPositionAsyncMocked,
    requestForegroundPermissionsAsyncMocked,
} from '../jest.setup';
import { serverSocket } from '../services/websockets';
import {
    generateArray,
    generateLocationObject,
    generateTrackMetadata,
} from '../tests/data';
import {
    extractTrackIDFromCardContainerTestID,
    fireEvent,
    renderApp,
    waitFor,
    within,
} from '../tests/tests-utils';

test(`
User should go to the musicPlayer into the tracks tab and hit a track card to vote for it
After the vote has been accepted the score will be updated and the card disabled
`, async () => {
    const deviceID = datatype.uuid();
    const userID = datatype.uuid();

    const tracksList = generateArray({
        minLength: 9,
        maxLength: 9,
        fill: () =>
            generateTrackMetadata({
                score: 0,
            }),
    });
    const state: MtvWorkflowStateWithUserRelatedInformation = {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: false,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        usersLength: 1,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userHasBeenInvited: false,
            userFitsPositionConstraint: null,
            emittingDeviceID: deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        roomCreatorUserID: userID,
        tracks: tracksList.slice(1),
        minimumScoreToBePlayed: 42,
    };

    if (state.tracks === null) throw new Error('state.track is null');

    serverSocket.on('MTV_VOTE_FOR_TRACK', ({ trackID }) => {
        if (state.tracks === null) throw new Error('state.track is null');
        const stateCpy: MtvWorkflowStateWithUserRelatedInformation = {
            ...state,
            userRelatedInformation: {
                ...state.userRelatedInformation,
                tracksVotedFor: [
                    ...state.userRelatedInformation.tracksVotedFor,
                    trackID,
                ],
            },
        };

        stateCpy.tracks = state.tracks
            .map((track) => {
                if (track.id === trackID) {
                    return {
                        ...track,
                        score: track.score + 1,
                    };
                }
                return track;
            })
            .sort((a, b) => (a.score < b.score ? 1 : -1));

        serverSocket.emit('MTV_VOTE_OR_SUGGEST_TRACK_CALLBACK', stateCpy);
    });

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', state);
    });

    const screen = await renderApp();

    /**
     * Retrieve context to have the appMusicPlayerMachine directly
     * in state connectedToRoom
     * And toggle mtv room full screen
     */

    const musicPlayerMini = await screen.findByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
        new RegExp(`${tracksList[0].title}.*${tracksList[0].artistName}`),
    );
    expect(miniPlayerTrackTitle).toBeTruthy();

    fireEvent.press(miniPlayerTrackTitle);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    /**
     * Find the last track card element
     */
    const trackCardElements = await waitFor(() => {
        const trackCardElements =
            screen.getAllByTestId(/track-card-container/i);
        expect(trackCardElements.length).toBe(state.tracks!.length);

        return trackCardElements;
    });

    const tracksIDs = trackCardElements.map(({ props: { testID } }) =>
        extractTrackIDFromCardContainerTestID(testID),
    );

    const trackToVoteFor = trackCardElements[trackCardElements.length - 1];
    const trackToVoteForID = tracksIDs[trackCardElements.length - 1];
    expect(trackToVoteFor).toBeTruthy();
    expect(trackToVoteFor).not.toBeDisabled();

    fireEvent.press(trackToVoteFor);

    await waitFor(() => {
        expect(
            screen.getByText(`1/${state.minimumScoreToBePlayed}`),
        ).toBeTruthy();

        const trackVotedForCard = screen.getByTestId(
            `${trackToVoteForID}-track-card`,
        );
        expect(trackVotedForCard).toBeTruthy();
        expect(trackVotedForCard).toBeDisabled();
    });
});

test('Voting is disabled for users outside of physical constraints bounds', async () => {
    const deviceID = datatype.uuid();
    const userID = datatype.uuid();

    const tracksList = generateArray({
        minLength: 9,
        maxLength: 9,
        fill: () =>
            generateTrackMetadata({
                score: 0,
            }),
    });
    const state: MtvWorkflowStateWithUserRelatedInformation = {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: false,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        usersLength: 1,
        hasTimeAndPositionConstraints: true,
        timeConstraintIsValid: true,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userHasBeenInvited: false,
            userFitsPositionConstraint: false,
            emittingDeviceID: deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        roomCreatorUserID: userID,
        tracks: tracksList.slice(1),
        minimumScoreToBePlayed: 42,
    };
    const location = generateLocationObject();

    requestForegroundPermissionsAsyncMocked.mockImplementationOnce(() => {
        const res: LocationPermissionResponse = {
            canAskAgain: true,
            expires: 'never',
            granted: true,
            status: PermissionStatus.GRANTED,
        };

        return Promise.resolve(res);
    });

    getCurrentPositionAsyncMocked.mockImplementation(() => {
        return Promise.resolve(location);
    });

    if (state.tracks === null) throw new Error('state.track is null');

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', state);
    });

    const voteForTrackCallbackMock = jest.fn();
    serverSocket.on('MTV_VOTE_FOR_TRACK', voteForTrackCallbackMock);

    const screen = await renderApp();

    const musicPlayerMini = await screen.findByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
        new RegExp(`${tracksList[0].title}.*${tracksList[0].artistName}`),
    );
    expect(miniPlayerTrackTitle).toBeTruthy();

    fireEvent.press(miniPlayerTrackTitle);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    /**
     * Find the last track card element
     */
    const lastTrackElement = state.tracks[state.tracks.length - 1];
    const lastTrack = await within(musicPlayerFullScreen).findByText(
        lastTrackElement.title,
    );
    expect(lastTrack).toBeTruthy();
    expect(lastTrack).toBeDisabled();

    fireEvent.press(lastTrack);

    expect(voteForTrackCallbackMock).not.toHaveBeenCalled();
});

test('Voting is disabled for users outside of time bounds', async () => {
    const deviceID = datatype.uuid();
    const userID = datatype.uuid();

    const tracksList = generateArray({
        minLength: 9,
        maxLength: 9,
        fill: () =>
            generateTrackMetadata({
                score: 0,
            }),
    });
    const state: MtvWorkflowStateWithUserRelatedInformation = {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: false,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        usersLength: 1,
        hasTimeAndPositionConstraints: true,
        timeConstraintIsValid: false,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userHasBeenInvited: false,
            userFitsPositionConstraint: true,
            emittingDeviceID: deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        roomCreatorUserID: userID,
        tracks: tracksList.slice(1),
        minimumScoreToBePlayed: 42,
    };
    const location = generateLocationObject();

    requestForegroundPermissionsAsyncMocked.mockImplementationOnce(() => {
        const res: LocationPermissionResponse = {
            canAskAgain: true,
            expires: 'never',
            granted: true,
            status: PermissionStatus.GRANTED,
        };

        return Promise.resolve(res);
    });

    getCurrentPositionAsyncMocked.mockImplementation(() => {
        return Promise.resolve(location);
    });

    if (state.tracks === null) throw new Error('state.track is null');

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', state);
    });

    const voteForTrackCallbackMock = jest.fn();
    serverSocket.on('MTV_VOTE_FOR_TRACK', voteForTrackCallbackMock);

    const screen = await renderApp();

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    fireEvent.press(musicPlayerMini);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    /**
     * Find the last track card element
     */
    const lastTrackElement = state.tracks[state.tracks.length - 1];
    const lastTrack = await within(musicPlayerFullScreen).findByText(
        lastTrackElement.title,
    );
    expect(lastTrack).toBeTruthy();
    expect(lastTrack).toBeDisabled();

    fireEvent.press(lastTrack);

    expect(voteForTrackCallbackMock).not.toHaveBeenCalled();
});
