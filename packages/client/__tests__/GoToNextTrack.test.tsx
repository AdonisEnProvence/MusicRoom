import { MtvPlayingModes, MtvWorkflowState } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, random } from 'faker';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import {
    fireEvent,
    noop,
    render,
    waitFor,
    waitForTimeout,
    within,
} from '../tests/tests-utils';

describe('Go to next track and globally control button tests', () => {
    it(`When the user clicks on next track button, it should play the next track, if there is one`, async () => {
        const tracksList = [generateTrackMetadata(), generateTrackMetadata()];

        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowState = {
            name: random.words(),
            roomID: datatype.uuid(),
            playing: false,
            roomCreatorUserID,
            usersLength: 1,
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
            currentTrack: {
                ...tracksList[0],
                elapsed: 0,
            },
            tracks: tracksList.slice(1),
            minimumScoreToBePlayed: 1,
        };

        serverSocket.on('GO_TO_NEXT_TRACK', () => {
            serverSocket.emit('ACTION_PLAY_CALLBACK', {
                ...initialState,
                playing: true,
                currentTrack: {
                    ...tracksList[1],
                    elapsed: 0,
                },
                tracks: tracksList.slice(2),
            });
        });

        const { getAllByText, getByTestId, findByA11yState } = render(
            <NavigationContainer
                ref={navigationRef}
                onReady={() => {
                    isReadyRef.current = true;
                }}
            >
                <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
            </NavigationContainer>,
        );

        serverSocket.emit('RETRIEVE_CONTEXT', initialState);

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
        const firstTrackDurationTime = within(
            musicPlayerFullScreen,
        ).getByLabelText(/minutes duration/i);
        expect(firstTrackDurationTime).not.toHaveTextContent('00:00');

        const nextTrackButton = within(musicPlayerFullScreen).getByLabelText(
            /play.*next.*track/i,
        );
        expect(nextTrackButton).toBeTruthy();

        fireEvent.press(nextTrackButton);

        await waitForTimeout(1_000);

        expect(
            await within(musicPlayerFullScreen).findByText(tracksList[1].title),
        ).toBeTruthy();
        const secondTrackDurationTime = within(
            musicPlayerFullScreen,
        ).getByLabelText(/minutes.*duration/i);
        expect(secondTrackDurationTime).not.toHaveTextContent('00:00');

        const pauseButton = within(musicPlayerFullScreen).getByLabelText(
            /pause.*video/i,
        );
        expect(pauseButton).toBeTruthy();
        expect(pauseButton).toBeEnabled();

        /**
         * Wait for the video player to load
         */
        await waitFor(() => {
            const secondTrackElapsedTime = within(
                musicPlayerFullScreen,
            ).getByLabelText(/minutes.*elapsed/i);

            expect(secondTrackElapsedTime).not.toHaveTextContent('00:00');
        });
    });

    it(`It should hide control button ( play or pause and go to next track )
        if the user doesn't have the control and delegation permission`, async () => {
        const tracksList = [generateTrackMetadata(), generateTrackMetadata()];

        const roomCreatorUserID = datatype.uuid();
        const initialState: MtvWorkflowState = {
            name: random.words(),
            roomID: datatype.uuid(),
            playing: false,
            playingMode: MtvPlayingModes.Values.BROADCAST,
            roomCreatorUserID,
            isOpen: true,
            isOpenOnlyInvitedUsersCanVote: false,
            hasTimeAndPositionConstraints: false,
            timeConstraintIsValid: null,
            delegationOwnerUserID: null,
            userRelatedInformation: {
                hasControlAndDelegationPermission: false,
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

        const musicPlayerMiniPlayButton =
            within(musicPlayerMini).queryByA11yLabel(/play.*video/i);
        expect(musicPlayerMiniPlayButton).toBeNull();

        const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
            new RegExp(`${tracksList[0].title}.*${tracksList[0].artistName}`),
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

        //Look for control buttons
        const nextTrackButton = within(musicPlayerFullScreen).queryByA11yLabel(
            /play.*next.*track/i,
        );
        expect(nextTrackButton).toBeNull();

        const playButton = within(musicPlayerFullScreen).queryByA11yLabel(
            /play.*video/i,
        );
        expect(playButton).toBeNull();
    });
});
