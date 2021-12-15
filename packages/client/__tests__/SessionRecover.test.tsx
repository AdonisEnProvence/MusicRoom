import { MtvWorkflowState } from '@musicroom/types';
import { datatype, name, random } from 'faker';
import { serverSocket } from '../services/websockets';
import { db } from '../tests/data';
import {
    fireEvent,
    renderApp,
    waitForTimeout,
    within,
} from '../tests/tests-utils';

test(`It should display the music player corresponding to the injected state on both CREATED_ROOM server socket callbacks`, async () => {
    const fakeTrack = db.searchableTracks.create();
    const roomName = random.words();
    const userID = datatype.uuid();
    const state: MtvWorkflowState = {
        roomID: datatype.uuid(),
        name: roomName,
        playing: false,
        usersLength: 1,
        playingMode: 'BROADCAST',
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
            userID,
            tracksVotedFor: [],
        },
        roomCreatorUserID: datatype.uuid(),
        currentTrack: {
            artistName: random.word(),
            id: datatype.uuid(),
            duration: 158000,
            elapsed: 0,
            title: fakeTrack.title,
            score: datatype.number(),
        },
        tracks: [
            {
                id: datatype.uuid(),
                artistName: name.findName(),
                duration: 42000,
                title: random.words(3),
                score: datatype.number(),
            },
        ],
        minimumScoreToBePlayed: 1,
    };

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    /**
     * Check that room is not ready
     * And button disabled
     */

    serverSocket.emit('MTV_CREATE_ROOM_SYNCHED_CALLBACK', {
        ...state,
        tracks: null,
        currentTrack: null,
    });

    await waitForTimeout(1_000);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerRoomName = await within(musicPlayerMini).findByText(
        roomName,
    );
    expect(miniPlayerRoomName).toBeTruthy();

    const miniPlayerPlayButton =
        within(musicPlayerMini).getByLabelText(/play.*video/i);
    expect(miniPlayerPlayButton).toBeTruthy();
    expect(miniPlayerPlayButton).toBeDisabled();

    fireEvent.press(miniPlayerRoomName);

    await waitForTimeout(1_000);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    const playButton = within(musicPlayerFullScreen).getByLabelText(
        /play.*video/i,
    );
    expect(playButton).toBeTruthy();
    expect(playButton).toBeDisabled();

    serverSocket.emit('MTV_CREATE_ROOM_CALLBACK', state);

    await waitForTimeout(1_000);

    expect(
        within(musicPlayerFullScreen).getByText(fakeTrack.title),
    ).toBeTruthy();

    const pauseButton = await within(musicPlayerFullScreen).findByLabelText(
        /play.*video/i,
    );
    expect(pauseButton).toBeTruthy();
    expect(pauseButton).not.toBeDisabled();
});

test(`It should display the music player corresponding to the injected state on both MTV_RETRIEVE_CONTEXT server socket event`, async () => {
    const fakeTrack = db.searchableTracks.create();
    const roomName = random.words();
    const userID = datatype.uuid();
    const state: MtvWorkflowState = {
        roomID: datatype.uuid(),
        name: roomName,
        playing: false,
        usersLength: 1,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        delegationOwnerUserID: null,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userHasBeenInvited: false,
            userFitsPositionConstraint: null,
            emittingDeviceID: datatype.uuid(),
            userID,
            tracksVotedFor: [],
        },
        roomCreatorUserID: userID,
        currentTrack: {
            artistName: random.word(),
            id: datatype.uuid(),
            duration: 158000,
            elapsed: 0,
            title: fakeTrack.title,
            score: datatype.number(),
        },
        tracks: [
            {
                id: datatype.uuid(),
                artistName: name.findName(),
                duration: 42000,
                title: random.words(3),
                score: datatype.number(),
            },
        ],
        minimumScoreToBePlayed: 1,
    };

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    /**
     * Check that room is not ready
     * And button disabled
     */

    serverSocket.emit('MTV_RETRIEVE_CONTEXT', state);

    await waitForTimeout(1_000);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerRoomName = await within(musicPlayerMini).findByText(
        roomName,
    );
    expect(miniPlayerRoomName).toBeTruthy();

    const miniPlayerPlayButton =
        within(musicPlayerMini).getByLabelText(/play.*video/i);
    expect(miniPlayerPlayButton).toBeTruthy();
    expect(miniPlayerPlayButton).not.toBeDisabled();

    fireEvent.press(miniPlayerRoomName);

    await waitForTimeout(1_000);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    const playButton = within(musicPlayerFullScreen).getByLabelText(
        /play.*video/i,
    );
    expect(playButton).toBeTruthy();
    expect(playButton).not.toBeDisabled();

    expect(
        within(musicPlayerFullScreen).getByText(fakeTrack.title),
    ).toBeTruthy();
});

test(`It should display the already elapsed track duration and player should be playing`, async () => {
    const fakeTrack = db.searchableTracks.create();
    const roomName = random.words();
    const userID = datatype.uuid();
    const state: MtvWorkflowState = {
        roomID: datatype.uuid(),
        name: roomName,
        playing: true,
        usersLength: 1,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        delegationOwnerUserID: null,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userHasBeenInvited: false,
            userFitsPositionConstraint: null,
            emittingDeviceID: datatype.uuid(),
            userID,
            tracksVotedFor: [],
        },
        roomCreatorUserID: userID,
        currentTrack: {
            artistName: random.word(),
            id: datatype.uuid(),
            duration: 158000,
            elapsed: 100000,
            title: fakeTrack.title,
            score: datatype.number(),
        },
        tracks: [
            {
                id: datatype.uuid(),
                artistName: name.findName(),
                duration: 42000,
                title: random.words(3),
                score: datatype.number(),
            },
        ],
        minimumScoreToBePlayed: 1,
    };

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    serverSocket.emit('MTV_RETRIEVE_CONTEXT', state);

    await waitForTimeout(1_000);
    await waitForTimeout(1_000);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerRoomName = await within(musicPlayerMini).findByText(
        roomName,
    );
    expect(miniPlayerRoomName).toBeTruthy();

    const miniPlayerPauseButton =
        within(musicPlayerMini).getByLabelText(/pause.*video/i);
    expect(miniPlayerPauseButton).toBeTruthy();
    expect(miniPlayerPauseButton).not.toBeDisabled();

    fireEvent.press(miniPlayerRoomName);

    await waitForTimeout(1_000);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    expect(
        within(musicPlayerFullScreen).getByText(fakeTrack.title),
    ).toBeTruthy();

    const pauseButton = within(musicPlayerFullScreen).getByLabelText(
        /pause.*video/i,
    );
    expect(pauseButton).toBeTruthy();
    expect(pauseButton).not.toBeDisabled();

    const nonZeroCurrentTime = within(musicPlayerFullScreen).getByLabelText(
        /elapsed/i,
    );
    expect(nonZeroCurrentTime).toBeTruthy();
    expect(nonZeroCurrentTime).toHaveTextContent(/01:4\d/);
});
