import { datatype, internet } from 'faker';
import { MtvRoomUsersListElement } from '@musicroom/types';
import { db, generateMtvWorklowState } from '../../../../tests/data';
import { serverSocket } from '../../../../services/websockets';
import { renderApp, fireEvent, waitFor } from '../../../../tests/tests-utils';

test('It should display user followers', async () => {
    const userID = datatype.uuid();
    const userNickname = internet.userName();
    db.userProfileInformation.create({
        userID,
        following: false,
        userNickname,
        followersCounter: 1,
        followingCounter: undefined,
        playlistsCounter: undefined,
    });
    const roomCreatorUserID = datatype.uuid();
    const initialState = generateMtvWorklowState({
        userType: 'CREATOR',
    });

    const fakeUsersArray: MtvRoomUsersListElement[] = [
        {
            hasControlAndDelegationPermission: true,
            isCreator: true,
            isDelegationOwner: true,
            isMe: true,
            nickname: internet.userName(),
            userID: roomCreatorUserID,
        },
        {
            hasControlAndDelegationPermission: false,
            isCreator: false,
            isDelegationOwner: false,
            isMe: false,
            nickname: userNickname,
            userID,
        },
    ];
    //Going to user page profile via mtv user list screen

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    serverSocket.on('MTV_GET_USERS_LIST', (cb) => {
        cb(fakeUsersArray);
    });

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    fireEvent.press(musicPlayerMini);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    const listenersButton = await screen.getByText(/listeners/i);
    expect(listenersButton).toBeTruthy();

    fireEvent.press(listenersButton);

    const userCardElement = await waitFor(() => {
        const userCardElement = screen.getByTestId(`${userNickname}-user-card`);
        expect(userCardElement).toBeTruthy();
        return userCardElement;
    });

    fireEvent.press(userCardElement);

    await waitFor(() => {
        const profileScreen = screen.getByTestId(
            `${userID}-profile-page-screen`,
        );
        expect(profileScreen).toBeTruthy();

        const followersCounter = screen.getByText(/.*followers.*1/i);
        expect(followersCounter).toBeTruthy();
    });

    const followersCounter = screen.getByText(/.*followers.*1/i);
    fireEvent.press(followersCounter);

    await waitFor(() => {
        expect(screen.getByTestId('search-user-followers-screen')).toBeTruthy();
    });
});

// test('It should not display user followers as user is not allowed to', async () => {

// test('It should display user not found', async () => {
