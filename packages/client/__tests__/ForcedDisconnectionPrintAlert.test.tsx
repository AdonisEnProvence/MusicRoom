import { datatype, name, random } from 'faker';
import Toast from 'react-native-toast-message';
import { serverSocket } from '../services/websockets';
import {
    fireEvent,
    renderApp,
    findBottomBarSearchButton,
} from '../tests/tests-utils';

test(`On MTV_FORCED_DISCONNECTION it should displays the a toast and minimize the music player`, async () => {
    const screen = await renderApp();

    /**
     * Retrieve context to have the appMusicPlayerMachine directly
     * in state connectedToRoom
     */
    const userID = datatype.uuid();
    serverSocket.emit('MTV_RETRIEVE_CONTEXT', {
        roomID: datatype.uuid(),
        name: random.word(),
        playing: false,
        usersLength: 1,
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        timeConstraintIsValid: null,
        delegationOwnerUserID: null,
        playingMode: 'BROADCAST',
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userFitsPositionConstraint: null,
            userHasBeenInvited: false,
            emittingDeviceID: datatype.uuid(),
            userID,
            tracksVotedFor: [],
        },
        currentTrack: null,
        roomCreatorUserID: userID,
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
    });

    /**
     * Firstly expecting to be on the home
     * And then click on GO TO MUSIC TRACK VOTE button
     */
    const homeScreenContrainer = await screen.findByTestId(
        'home-screen-container',
    );
    expect(homeScreenContrainer).toBeTruthy();

    const searchScreenLink = await findBottomBarSearchButton({ screen });
    expect(searchScreenLink).toBeTruthy();
    fireEvent.press(searchScreenLink);
    expect(await screen.findByTestId('search-track-screen')).toBeTruthy();

    serverSocket.emit('MTV_FORCED_DISCONNECTION');

    expect(Toast.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Creator leaved his Music Track Vote room',
        text2: `You've been forced disconnected`,
    });

    /**
     * We expect that the music player would be dismissed, as the user was previously on the search tab
     * we expect that he comes back there
     */
    const searchTrackContainer = await screen.findByTestId(
        'search-track-screen',
    );
    expect(searchTrackContainer).toBeTruthy();
});
