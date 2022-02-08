import { datatype, internet } from 'faker';
import { MtvRoomUsersListElement } from '@musicroom/types';
import Toast from 'react-native-toast-message';
import { serverSocket } from '../../../services/websockets';
import { db, generateMtvWorklowState } from '../../../tests/data';
import { fireEvent, renderApp, waitFor } from '../../../tests/tests-utils';

test('It should unfollow related user, and hide his followers only information', async () => {
    const userID = datatype.uuid();
    const userNickname = internet.userName();
    db.userProfileInformation.create({
        userID,
        following: true,
        userNickname,
        followersCounter: 1,
        followingCounter: 2,
        playlistsCounter: 3,
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
        const unfollowButton = screen.getByTestId(`unfollow-${userID}-button`);
        expect(unfollowButton).toBeTruthy();
        const playlistsCounter = screen.getByText(/.*playlists.*3/i);
        const followersCounter = screen.getByText(/.*followers.*1/i);
        const followingCounter = screen.getByText(/.*following.*2/i);
        expect(playlistsCounter).toBeTruthy();
        expect(followersCounter).toBeTruthy();
        expect(followingCounter).toBeTruthy();
    });

    const unfollowButton = screen.getByTestId(`unfollow-${userID}-button`);
    expect(unfollowButton).toBeTruthy();
    expect(unfollowButton).not.toBeDisabled();

    db.userProfileInformation.update({
        data: {
            followersCounter: undefined,
            followingCounter: undefined,
            playlistsCounter: undefined,
        },
        where: {
            userID: {
                equals: userID,
            },
        },
    });
    fireEvent.press(unfollowButton);

    await waitFor(() => {
        const followButton = screen.getByTestId(`follow-${userID}-button`);
        expect(followButton).toBeTruthy();
        const playlistCounter = screen.queryByTestId(
            `${userID}-playlists-button`,
        );
        const followersCounter = screen.queryByTestId(
            `${userID}-followers-button`,
        );
        const followingCounter = screen.queryByTestId(
            `${userID}-following-button`,
        );
        expect(playlistCounter).toBeNull();
        expect(followersCounter).toBeNull();
        expect(followingCounter).toBeNull();
    });
});

test('It should display toast error on unfollow operation error', async () => {
    const userID = datatype.uuid();
    const userNickname = internet.userName();
    db.userProfileInformation.create({
        userID,
        following: true,
        userNickname,
        followersCounter: 1,
        followingCounter: 2,
        playlistsCounter: 3,
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
        const unfollowButton = screen.getByTestId(`unfollow-${userID}-button`);
        expect(unfollowButton).toBeTruthy();
        const playlistsCounter = screen.getByText(/.*playlists.*3/i);
        const followersCounter = screen.getByText(/.*followers.*1/i);
        const followingCounter = screen.getByText(/.*following.*2/i);
        expect(playlistsCounter).toBeTruthy();
        expect(followersCounter).toBeTruthy();
        expect(followingCounter).toBeTruthy();
    });

    const unfollowButton = screen.getByTestId(`unfollow-${userID}-button`);
    expect(unfollowButton).toBeTruthy();
    expect(unfollowButton).not.toBeDisabled();

    //Will throw 404 as corresponding userProfileInformation entry doesn't exist in msw data
    db.userProfileInformation.delete({
        where: {
            userID: {
                equals: userID,
            },
        },
    });
    fireEvent.press(unfollowButton);

    await waitFor(() => {
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'error',
            text1: 'Operation failed, please try again later',
        });
    });
});
