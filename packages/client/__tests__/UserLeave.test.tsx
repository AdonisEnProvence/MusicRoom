import { MtvWorkflowState, UserDevice } from '@musicroom/types';
import { datatype, random } from 'faker';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import { fireEvent, renderApp, waitFor, within } from '../tests/tests-utils';

test(`
User should go to the musicPlayer into the settings tab an hit the leave button
He will be redirected to the home and will view the default mini music player
`, async () => {
    const userDevices: UserDevice[] = Array.from({ length: 3 }).map(() => ({
        deviceID: datatype.uuid(),
        name: random.word(),
    }));
    const thisDevice = userDevices[0];
    const userID = datatype.uuid();
    const state: MtvWorkflowState = {
        roomID: datatype.uuid(),
        name: random.word(),
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
            userFitsPositionConstraint: null,
            userHasBeenInvited: false,
            emittingDeviceID: thisDevice.deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: null,
        roomCreatorUserID: userID,
        tracks: [generateTrackMetadata()],
        minimumScoreToBePlayed: 1,
    };

    let leaveRoomServerListenerHasBeenCalled = false;
    serverSocket.on('MTV_LEAVE_ROOM', () => {
        leaveRoomServerListenerHasBeenCalled = true;
    });

    const screen = await renderApp();

    /**
     * Retrieve context to have the appMusicPlayerMachine directly
     * in state connectedToRoom
     * And toggle mtv room full screen
     */

    serverSocket.emit('MTV_RETRIEVE_CONTEXT', state);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    fireEvent.press(musicPlayerMini);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    /**
     * Toggle Settings tab
     * And Search for leave room button
     */

    const goSettingsButton = within(musicPlayerFullScreen).getByText(
        /Settings/i,
    );
    expect(goSettingsButton).toBeTruthy();
    fireEvent.press(goSettingsButton);

    expect(await screen.findByText(/settings tab/i)).toBeTruthy();

    /**
     * Press on the leave room button
     */
    const leaveRoomButton = within(musicPlayerFullScreen).getByText(/LEAVE/i);
    expect(leaveRoomButton).toBeTruthy();

    /**
     * As the room doesn't have any constraint
     * Check that this button doesn't appear
     */
    const requestLocationButton = within(musicPlayerFullScreen).queryByText(
        /LOCATION/i,
    );
    expect(requestLocationButton).toBeNull();

    fireEvent.press(leaveRoomButton);

    serverSocket.emit('MTV_LEAVE_ROOM_CALLBACK');

    await waitFor(() => {
        const elements = screen.queryAllByA11yState({ expanded: false });
        expect(elements.length).toBe(0);
    });

    expect(leaveRoomServerListenerHasBeenCalled).toBeTruthy();
    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
    expect(
        within(musicPlayerMini).getByText(/Join a room to listen to music/i),
    ).toBeTruthy();
});
