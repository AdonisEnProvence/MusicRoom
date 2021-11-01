import { MtvWorkflowStateWithUserRelatedInformation } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { LocationPermissionResponse, PermissionStatus } from 'expo-location';
import faker, { datatype, random } from 'faker';
import React from 'react';
import {
    getCurrentPositionAsyncMocked,
    requestForegroundPermissionsAsyncMocked,
} from '../jest.setup';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import {
    generateArray,
    generateLocationObject,
    generateTrackMetadata,
} from '../tests/data';
import { fireEvent, noop, render, within } from '../tests/tests-utils';

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

    serverSocket.on('VOTE_FOR_TRACK', ({ trackID }) => {
        if (state.tracks === null) throw new Error('state.track is null');
        state.userRelatedInformation.tracksVotedFor.push(trackID);

        state.tracks = state.tracks
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

        serverSocket.emit('VOTE_OR_SUGGEST_TRACK_CALLBACK', state);
    });

    serverSocket.on('GET_CONTEXT', () => {
        serverSocket.emit('RETRIEVE_CONTEXT', state);
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
    const lastTrackElement = state.tracks[state.tracks.length - 1];
    const lastTrack = await within(musicPlayerFullScreen).findByText(
        lastTrackElement.title,
    );
    expect(lastTrack).toBeTruthy();

    fireEvent.press(lastTrack);

    const firstTrackElement = state.tracks[0];
    expect(
        await within(musicPlayerFullScreen).findAllByText(
            new RegExp(
                `${firstTrackElement.score}/${state.minimumScoreToBePlayed}`,
            ),
        ),
    ).toBeTruthy();

    const votedTrackCard = await within(musicPlayerFullScreen).findByText(
        firstTrackElement.title,
    );
    expect(votedTrackCard).toBeDisabled();
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

    serverSocket.on('GET_CONTEXT', () => {
        serverSocket.emit('RETRIEVE_CONTEXT', state);
    });

    const voteForTrackCallbackMock = jest.fn();
    serverSocket.on('VOTE_FOR_TRACK', voteForTrackCallbackMock);

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

    serverSocket.on('GET_CONTEXT', () => {
        serverSocket.emit('RETRIEVE_CONTEXT', state);
    });

    const voteForTrackCallbackMock = jest.fn();
    serverSocket.on('VOTE_FOR_TRACK', voteForTrackCallbackMock);

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

    const musicPlayerMini = getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    fireEvent.press(musicPlayerMini);

    const musicPlayerFullScreen = await findByA11yState({ expanded: true });
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
