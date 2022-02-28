import { internet } from 'faker';
import Toast from 'react-native-toast-message';
import { db } from '../../../tests/data';
import {
    fireEvent,
    renderApp,
    testGetFakeUserID,
    waitFor,
} from '../../../tests/tests-utils';

test('It should display my profile page with my profile information', async () => {
    const userID = testGetFakeUserID();

    db.myProfileInformation.create({
        userID,
        devicesCounter: 3,
        playlistsCounter: 4,
        followersCounter: 5,
        followingCounter: 6,
        userNickname: internet.userName(),
    });

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const myProfileButton = screen.getByTestId('open-my-profile-page-button');
    expect(myProfileButton).toBeTruthy();

    fireEvent.press(myProfileButton);

    await waitFor(() => {
        expect(screen.getByTestId('my-profile-page-container')).toBeTruthy();

        const devicesCounter = screen.getByText(/devices.*3/i);
        expect(devicesCounter).toBeTruthy();

        const playlistsCounter = screen.getByText(/playlists.*4/i);
        expect(playlistsCounter).toBeTruthy();

        const followersCounter = screen.getByText(/followers.*5/i);
        expect(followersCounter).toBeTruthy();

        const followingCounter = screen.getByText(/following.*6/i);
        expect(followingCounter).toBeTruthy();

        const avatar = screen.getByLabelText(/my.*avatar/i);
        expect(avatar).toBeTruthy();
    });
});

test('It should display my profile not found screen', async () => {
    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const myProfileButton = screen.getByTestId('open-my-profile-page-button');
    expect(myProfileButton).toBeTruthy();

    fireEvent.press(myProfileButton);

    await waitFor(() => {
        expect(
            screen.getByTestId('default-my-profile-page-screen'),
        ).toBeTruthy();
        const goBackButton = screen.getByText(/go back/i);
        expect(goBackButton).toBeTruthy();
        expect(Toast.show).toHaveBeenNthCalledWith(1, {
            type: 'error',
            text1: 'User not found',
        });
    });
});

test('It should display my library after pressing playlists counter', async () => {
    const userID = testGetFakeUserID();

    db.myProfileInformation.create({
        userID,
        devicesCounter: 3,
        playlistsCounter: 4,
        followersCounter: 5,
        followingCounter: 6,
        userNickname: internet.userName(),
    });

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const myProfileButton = screen.getByTestId('open-my-profile-page-button');
    expect(myProfileButton).toBeTruthy();

    fireEvent.press(myProfileButton);

    const playlistsCounter = await waitFor(() => {
        expect(screen.getByTestId('my-profile-page-container')).toBeTruthy();

        const devicesCounter = screen.getByText(/devices.*3/i);
        expect(devicesCounter).toBeTruthy();

        const playlistsCounter = screen.getByText(/playlists.*4/i);
        expect(playlistsCounter).toBeTruthy();

        const followersCounter = screen.getByText(/followers.*5/i);
        expect(followersCounter).toBeTruthy();

        const followingCounter = screen.getByText(/following.*6/i);
        expect(followingCounter).toBeTruthy();

        const avatar = screen.getByLabelText(/my.*avatar/i);
        expect(avatar).toBeTruthy();

        return playlistsCounter;
    });

    expect(playlistsCounter).toBeTruthy();

    fireEvent.press(playlistsCounter);

    await waitFor(() => {
        expect(screen.getByTestId('library-mpe-rooms-list')).toBeTruthy();
        expect(screen.queryByTestId('my-profile-page-container')).toBeNull();
    });
});
