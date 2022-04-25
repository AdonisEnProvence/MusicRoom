import { datatype, internet } from 'faker';
import { MtvRoomUsersListElement } from '@musicroom/types';
import Toast from 'react-native-toast-message';
import { serverSocket } from '../../../services/websockets';
import { db, generateMtvWorklowState } from '../../../tests/data';
import {
    fireEvent,
    renderApp,
    waitFor,
    render,
    within,
} from '../../../tests/tests-utils';

interface WithinUserProfileScreen {
    screen: ReturnType<typeof render>;
    userID: string;
}

async function withinUserProfileScreen({
    screen,
    userID,
}: WithinUserProfileScreen) {
    return within(await screen.findByTestId(`${userID}-profile-page-screen`));
}

test('It should display user not found after display unkown user profile page', async () => {
    const userID = datatype.uuid();
    const userNickname = internet.userName();
    //Not creating any db.userProfileInformation on purpose
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
        const profileScreen = screen.getByTestId(`default-profile-page-screen`);
        expect(profileScreen).toBeTruthy();
        const goBackButton = screen.getByText(/go back/i);
        expect(goBackButton).toBeTruthy();
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'error',
            text1: 'User not found',
        });
    });
});

test('It should display not followed known user profile page', async () => {
    const userID = datatype.uuid();
    const userNickname = internet.userName();
    db.userProfileInformation.create({
        userID,
        following: false,
        userNickname,
        followersCounter: undefined,
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

    const userProfileScreen = await withinUserProfileScreen({
        screen,
        userID,
    });

    await waitFor(() => {
        const followButton = userProfileScreen.getByText(/^follow$/i);
        expect(followButton).toBeTruthy();

        const playlistCounter = userProfileScreen.queryByTestId(
            `${userID}-playlists-button`,
        );
        expect(playlistCounter).toBeNull();

        const followersCounter = userProfileScreen.queryByTestId(
            `${userID}-followers-button`,
        );
        expect(followersCounter).toBeNull();

        const followingCounter = userProfileScreen.queryByTestId(
            `${userID}-following-button`,
        );
        expect(followingCounter).toBeNull();

        const userAvatar = userProfileScreen.getByLabelText(
            `${userNickname} avatar`,
        );
        expect(userAvatar).toBeTruthy();
    });
});

test('It should display not followed known user profile page with every user information', async () => {
    const userID = datatype.uuid();
    const userNickname = internet.userName();
    db.userProfileInformation.create({
        userID,
        following: false,
        userNickname,
        playlistsCounter: 3,
        followersCounter: 4,
        followingCounter: 5,
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

    const userProfileScreen = await withinUserProfileScreen({
        screen,
        userID,
    });

    await waitFor(() => {
        const followButton = userProfileScreen.getByText(/^follow$/i);
        expect(followButton).toBeTruthy();

        const playlistsCounter = userProfileScreen.getByTestId(
            new RegExp(`${userID}-Playlists-user-profile-information-3`),
        );
        expect(playlistsCounter).toBeTruthy();

        const followersCounter = userProfileScreen.getByTestId(
            new RegExp(`${userID}-Followers-user-profile-information-4`),
        );
        expect(followersCounter).toBeTruthy();

        const followingCounter = userProfileScreen.getByTestId(
            new RegExp(`${userID}-Following-user-profile-information-5`),
        );
        expect(followingCounter).toBeTruthy();

        const userAvatar = userProfileScreen.getByLabelText(
            `${userNickname} avatar`,
        );
        expect(userAvatar).toBeTruthy();
    });
});

test('It should display followed known user profile page', async () => {
    const userID = datatype.uuid();
    const userNickname = internet.userName();
    db.userProfileInformation.create({
        userID,
        following: true,
        userNickname,
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

    const userProfileScreen = await withinUserProfileScreen({
        screen,
        userID,
    });

    await waitFor(() => {
        const followButton = userProfileScreen.getByText(/^unfollow$/i);
        expect(followButton).toBeTruthy();

        const userAvatar = userProfileScreen.getByLabelText(
            `${userNickname} avatar`,
        );
        expect(userAvatar).toBeTruthy();
    });
});
