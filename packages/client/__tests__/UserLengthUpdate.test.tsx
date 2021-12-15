import { MtvWorkflowState, UserDevice } from '@musicroom/types';
import { datatype, random } from 'faker';
import { serverSocket } from '../services/websockets';
import { generateTrackMetadata } from '../tests/data';
import { fireEvent, renderApp, within } from '../tests/tests-utils';

test(`
    After the client receives a MTV_USER_LENGTH_UPDATE we expect the player to display
    2 current listeners
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
        playingMode: 'BROADCAST',
        usersLength: 1,
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userHasBeenInvited: false,
            userFitsPositionConstraint: null,
            emittingDeviceID: thisDevice.deviceID,
            userID,
            tracksVotedFor: [],
        },
        currentTrack: null,
        roomCreatorUserID: userID,
        tracks: [generateTrackMetadata()],
        minimumScoreToBePlayed: 1,
    };

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
     * Emit a server MTV_USER_LENGTH_UPDATE socket event
     * And check for it's receiption
     */

    serverSocket.emit('MTV_USER_LENGTH_UPDATE', {
        ...state,
        usersLength: state.usersLength + 1,
    });

    const listernersElement = await within(musicPlayerFullScreen).findByText(
        /2 listeners/i,
    );
    expect(listernersElement).toBeTruthy();
});
