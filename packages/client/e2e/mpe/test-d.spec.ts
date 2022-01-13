import { test, expect } from '@playwright/test';
import {
    createMpeRoom,
    getAddTrackButton,
    knownSearches,
    pressMpeRoomInvitationToast,
    searchAndJoinMpeRoomFromMpeRoomsSearchEngine,
} from '../_utils/mpe-e2e-utils';
import { closeAllContexts, setupAndGetUserPage } from '../_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

// Test-c UserA creates a room and invites UserB in it
// UserA creates a public and onlyInvitedUsersCanEdit mpe room and goes to the created mpe room view
// UserA hit the invite user button and search for UserB nickname and invites him
// UserB receives the UserA MpeRoom invitation via the toast, he presses the toast UserB is redirected to the related mpe room view
// UserB presses the join button, he then joins the room he should be able to edit the playlist
// UserC goes to the mpe search engine view and searches for the UserA room and presses the list element, he's now redirected to the UserA mpe room view
// UserC joins the room, as it's in onlyInvitedUsersCanEdit he should not be able to edit the playlist
test('MpeRoom invitation and onlyInvitedUserCanEdit test', async ({
    browser,
}) => {
    const { page: creatorUserA, userNickname: creatorUserANickname } =
        await setupAndGetUserPage({
            browser,
            knownSearches,
            userIndex: 0,
        });

    const { page: joiningUserB, userNickname: userBNickname } =
        await setupAndGetUserPage({
            browser,
            knownSearches,
            userIndex: 1,
        });

    const { page: joiningUserC } = await setupAndGetUserPage({
        browser,
        knownSearches,
        userIndex: 2,
    });

    const { roomName } = await createMpeRoom({
        page: creatorUserA,
    });

    //Creator invites userB
    const inviteUserButton = creatorUserA.locator(
        `css=[data-testid="mpe-invite-user-button"]`,
    );
    expect(inviteUserButton).toBeTruthy();
    await expect(inviteUserButton).toBeVisible();

    await inviteUserButton.click();

    await expect(creatorUserA.locator(`text="Users search"`)).toBeVisible();

    const usersSearch = creatorUserA.locator(
        'css=[placeholder^="Search a user by name"] >> visible=true >> nth=-1',
    );
    await usersSearch.click();
    await usersSearch.fill(userBNickname);

    const userCard = creatorUserA.locator(`text=${userBNickname}`);
    await expect(userCard).toBeVisible();

    await Promise.all([
        pressMpeRoomInvitationToast({
            page: joiningUserB,
            invitingUserName: creatorUserANickname,
            roomName,
        }),
        userCard.click(),
    ]);

    const hasBeenInvitedIcon = creatorUserA.locator(
        `css=[data-testid="${userBNickname}-user-card"] [aria-label="Has been invited"]`,
    );
    await expect(hasBeenInvitedIcon).toBeVisible();

    //UserB has hit the toast
    const joinRoomButton = joiningUserB.locator(`text="JOIN"`);
    await expect(joinRoomButton).toBeVisible();
    await expect(joinRoomButton).toBeEnabled();

    await joinRoomButton.click();

    await expect(
        getAddTrackButton({
            page: joiningUserB,
        }),
    ).not.toHaveAttribute('aria-disabled', 'true');

    await searchAndJoinMpeRoomFromMpeRoomsSearchEngine({
        page: joiningUserC,
        roomName,
    });

    await expect(
        getAddTrackButton({
            page: joiningUserC,
        }),
    ).toHaveAttribute('aria-disabled', 'true');
});
