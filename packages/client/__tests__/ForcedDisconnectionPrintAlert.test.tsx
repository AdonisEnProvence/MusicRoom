import { datatype, name, random } from 'faker';
import { serverSocket } from '../services/websockets';
import { fireEvent, renderApp, within } from '../tests/tests-utils';

test(`On MTV_FORCED_DISCONNECTION it should displays the alert modal and dismiss it when clicking on dismiss button`, async () => {
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
    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
    const goToMusicTrackVoteButton = await screen.findByText(
        /GO TO MUSIC TRACK VOTE/i,
    );
    expect(goToMusicTrackVoteButton).toBeTruthy();
    fireEvent.press(goToMusicTrackVoteButton);
    expect(screen.getAllByText(/Track Vote/i)).toBeTruthy();

    serverSocket.emit('MTV_FORCED_DISCONNECTION');

    /**
     * After MTV_FORCED_DISCONNECTION we expect the user to be on the Alert screen
     */
    const dismissButton = await screen.findByText(/DISMISS/i);
    expect(dismissButton).toBeTruthy();
    expect(await screen.getByText(/FORCED_DISCONNECTION/i)).toBeTruthy();

    /**
     * By clicking on the dismiss button the user should see the home
     */
    fireEvent.press(dismissButton);
    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
    const musicPlayerMini = screen.getByTestId('music-player-mini');

    expect(
        within(musicPlayerMini).getByText(/Join a room to listen to music/i),
    ).toBeTruthy();
});
