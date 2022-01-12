import { internet } from 'faker';
import { serverSocket } from '../../../services/websockets';
import { db, generateArray, generateUserSummary } from '../../../tests/data';
import { fireEvent, waitFor } from '../../../tests/tests-utils';
import { createMpeRoom, joinMpeRoom } from '../../../tests/tests-mpe-utils';

const fakeUsers = generateArray({
    minLength: 8,
    maxLength: 8,
    fill: () => generateUserSummary({ nickname: `A${internet.userName()}` }),
});

test('It should emit a creator invite user in mpe room event', async () => {
    const { screen, state } = await createMpeRoom();

    for (const fakeUser of fakeUsers) {
        db.searchableUsers.create(fakeUser);
    }
    const firstUser = fakeUsers[0];

    const inviteUserButton = screen.getByTestId(`mpe-invite-user-button`);
    expect(inviteUserButton).toBeTruthy();
    expect(inviteUserButton).not.toBeDisabled();

    fireEvent.press(inviteUserButton);

    const searchUsersInput = await waitFor(() => {
        const [usersSearchInput] = screen.getAllByPlaceholderText(
            /search.*user.*by.*name/i,
        );
        expect(usersSearchInput).toBeTruthy();
        return usersSearchInput;
    });

    fireEvent(searchUsersInput, 'focus');
    fireEvent.changeText(searchUsersInput, firstUser.nickname);

    const firstUserCard = await waitFor(() => {
        const firstUserCard = screen.getByTestId(
            `${firstUser.nickname}-user-card`,
        );
        expect(firstUserCard).toBeTruthy();
        expect(firstUserCard).not.toBeDisabled();
        return firstUserCard;
    });

    let serverSocketEventHandlerHasBeenCalled = false;
    serverSocket.on('MPE_CREATOR_INVITE_USER', () => {
        serverSocketEventHandlerHasBeenCalled = true;
    });

    fireEvent.press(firstUserCard);

    await waitFor(() => {
        expect(serverSocketEventHandlerHasBeenCalled).toBeTruthy();
    });
});

test('It should emit a creator invite user in mpe room event', async () => {
    const { screen } = await joinMpeRoom();

    for (const fakeUser of fakeUsers) {
        db.searchableUsers.create(fakeUser);
    }

    const inviteUserButton = screen.queryByTestId(`mpe-invite-user-button`);
    expect(inviteUserButton).toBeNull();
});
