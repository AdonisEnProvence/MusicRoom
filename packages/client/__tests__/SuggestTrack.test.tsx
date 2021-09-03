import { MtvWorkflowState } from '@musicroom/types';
import { NavigationContainer } from '@react-navigation/native';
import { datatype, random } from 'faker';
import React from 'react';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { serverSocket } from '../services/websockets';
import { db } from '../tests/data';
import {
    fireEvent,
    noop,
    render,
    waitFor,
    waitForElementToBeRemoved,
    within,
} from '../tests/tests-utils';

test(`A user can suggest tracks to play`, async () => {
    const fakeTrack = db.tracks.create();
    const tracksList = [db.tracksMetadata.create(), db.tracksMetadata.create()];

    const roomCreatorUserID = datatype.uuid();
    const initialState: MtvWorkflowState = {
        name: random.words(),
        roomID: datatype.uuid(),
        playing: false,
        roomCreatorUserID,
        userRelatedInformation: {
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
            } else {
                const track = db.tracks.findFirst({
                    where: { id: { equals: suggestedTrackID } },
                });

                if (track === null) {
                    throw new Error(
                        `Could not find a track with this id (${suggestedTrackID}) in tracks database. Check that you called db.tracks.create().`,
                    );
                }
                // Don't know to maintain that TODO
                //
                // const toAdd = db.tracks.create({
                //     id: suggestedTrackID,
                //     title: track.title,
                //     artistName: track.artistName,
                //     duration: track.duration,
                // });

                initialState.tracks.push({
                    id: suggestedTrackID,
                    title: track.title,
                    artistName: track.artistName,
                    duration: track.duration,
                    score: 1,
                });
            }
        });

        serverSocket.emit('SUGGESTED_TRACKS_LIST_UPDATE', initialState);
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

    const suggestedTrack = await within(musicPlayerFullScreen).findByText(
        fakeTrack.title,
    );
    expect(suggestedTrack).toBeTruthy();
});
