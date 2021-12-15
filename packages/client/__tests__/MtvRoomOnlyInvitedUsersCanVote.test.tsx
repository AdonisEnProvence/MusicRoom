import { MtvPlayingModes, MtvWorkflowState } from '@musicroom/types';
import { datatype, random } from 'faker';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import { fireEvent, renderApp, within } from '../tests/tests-utils';

/**
 * Concerning the element .toBeDisabled and .toBeEnabled assertions.
 * We're following a global rule:
 * - element.toBeDisabled checks the element and his parent.
 * - element.toBeEnabled checks the element only
 * We prefer checking the element and it's parents, then we will using element.toBeDisabled only.
 * In this way to check if an element is enabled we will use element.not.disabled
 */

it(`It should disable voting for a track as room is in OnlyInvitedUsers can vote mode
as user is not invited`, async () => {
    const tracksList = [generateTrackMetadata(), generateTrackMetadata()];

    const roomCreatorUserID = datatype.uuid();
    const userID = datatype.uuid();
    const initialState: MtvWorkflowState = {
        name: random.words(),
        roomID: datatype.uuid(),
        playing: false,
        playingMode: MtvPlayingModes.Values.BROADCAST,
        roomCreatorUserID,
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: true,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: false,
            userFitsPositionConstraint: null,
            userHasBeenInvited: false,
            emittingDeviceID: datatype.uuid(),
            userID,
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

    const trackCardList = within(musicPlayerFullScreen).getByTestId(
        `${tracksList[1].id}-track-card`,
    );
    expect(trackCardList).toBeTruthy();
    expect(trackCardList).toBeDisabled();
});

it(`It should not disable voting for a track as room is in OnlyInvitedUsers can vote mode
as user is invited`, async () => {
    const tracksList = [generateTrackMetadata(), generateTrackMetadata()];

    const roomCreatorUserID = datatype.uuid();
    const userID = datatype.uuid();
    const initialState: MtvWorkflowState = {
        name: random.words(),
        roomID: datatype.uuid(),
        playing: false,
        playingMode: MtvPlayingModes.Values.BROADCAST,
        roomCreatorUserID,
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: true,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: false,
            userFitsPositionConstraint: null,
            userHasBeenInvited: true,
            emittingDeviceID: datatype.uuid(),
            userID,
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

    const trackCardList = within(musicPlayerFullScreen).getByTestId(
        `${tracksList[1].id}-track-card`,
    );
    expect(trackCardList).not.toBeDisabled();
});
