import { Page, test, expect, Locator } from '@playwright/test';
import { internet } from 'faker';
import {
    knownSearches,
    goToHomeTabScreen,
    goToMyProfileFromHomeTab,
    goToMyProfileSettingsFromMyProfileScreen,
    withinPlaylistsVisibilityContainer,
    withinRelationsVisibilityContainer,
    goToEditMyNicknameFromMyProfileScreen,
    withinEditMyNicknameContainer,
    hitGoBack,
    withinMyProfilePageContainer,
    withinMyUserProfilePageContainer,
} from '../_utils/mpe-e2e-utils';
import { hitGoNextButton } from '../_utils/global';
import { closeAllContexts, setupAndGetUserPage } from '../_utils/page';
import { assertIsNotNull, assertIsNotUndefined } from '../_utils/assert';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

async function createMtvRoom({ creatorPage }: { creatorPage: Page }) {
    await expect(creatorPage.locator('text="Home"').first()).toBeVisible();

    const goToTracksSearch = creatorPage.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = 'BB Brunes';
    await creatorPage.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackQuery,
    );
    await creatorPage.keyboard.press('Enter');

    const firstMatchingSong = creatorPage.locator('text=BB Brunes').first();
    await expect(firstMatchingSong).toBeVisible();

    const selectedSongTitle = await firstMatchingSong.textContent();
    assertIsNotNull(
        selectedSongTitle,
        'The selected song must exist and have a text content',
    );

    await firstMatchingSong.click();

    const createMtvRoomModalButton = creatorPage.locator('text="Create MTV"');
    await createMtvRoomModalButton.click();

    await expect(
        creatorPage.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    const roomName = 'MusicRoom is the best';
    await creatorPage.fill(
        'css=[placeholder="Francis Cabrel OnlyFans"]',
        roomName,
    );

    await hitGoNextButton({
        page: creatorPage,
    });

    await expect(
        creatorPage.locator('text="What is the opening status of the room?"'),
    ).toBeVisible();

    const publicMode = creatorPage.locator(
        'css=[aria-selected="true"] >> text="Public"',
    );
    await expect(publicMode).toBeVisible();
    await hitGoNextButton({
        page: creatorPage,
    });

    const noVotingRestriction = creatorPage.locator(
        'css=[aria-selected="true"] >> text="No restriction"',
    );
    await expect(noVotingRestriction).toBeVisible();
    await hitGoNextButton({
        page: creatorPage,
    });

    const broadcastMode = creatorPage.locator(
        'css=[aria-selected="true"] >> text="Broadcast"',
    );
    await expect(broadcastMode).toBeVisible();
    await hitGoNextButton({
        page: creatorPage,
    });

    const twoVotesConstraintButton = creatorPage.locator(
        `text="Friendly online event"`,
    );
    await expect(twoVotesConstraintButton).toBeVisible();
    await twoVotesConstraintButton.click();
    await hitGoNextButton({
        page: creatorPage,
    });

    await expect(
        creatorPage.locator('text="Confirm room creation"'),
    ).toBeVisible();
    const elementWithSelectedSongTitle = creatorPage
        .locator(`text=${selectedSongTitle}`)
        .last();
    await expect(elementWithSelectedSongTitle).toBeVisible();
    await hitGoNextButton({
        page: creatorPage,
    });

    const miniPlayerWithRoomName = creatorPage
        .locator(`text="${roomName}"`)
        .first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    const miniPlayerWithSelectedSong = creatorPage
        .locator(`text=${selectedSongTitle}`)
        .first();
    await expect(miniPlayerWithSelectedSong).toBeVisible();

    return {
        roomName,
        initialTrack: selectedSongTitle,
    };
}

async function joinMtvRoom({
    joinerPage,
    roomName,
}: {
    joinerPage: Page;
    roomName: string;
}) {
    await joinerPage.click('text="Go to Music Track Vote"');

    // Code to use infinite scroll
    let matchingRoom: Locator | undefined;
    let hasFoundRoom = false;

    await joinerPage.mouse.move(
        (joinerPage.viewportSize()?.width ?? 0) / 2,
        150,
    );
    while (hasFoundRoom === false) {
        await joinerPage.mouse.wheel(0, 999999);

        matchingRoom = joinerPage.locator(`text="${roomName}"`).first();
        const isMatchingRoomVisible = await matchingRoom.isVisible();
        if (isMatchingRoomVisible === false) {
            hasFoundRoom = false;

            continue;
        }

        hasFoundRoom = true;
    }
    assertIsNotUndefined(matchingRoom);

    await expect(matchingRoom).toBeVisible();

    await matchingRoom.click();

    const expectedListenersCounterAriaLabel = `2 Listeners`;
    await expect(
        joinerPage.locator(
            `text="${expectedListenersCounterAriaLabel}" >> visible=true`,
        ),
    ).toBeVisible();
}

async function userGoesToTheMtvUsersListFromFullscreenPlayer({
    page,
    usersLength,
}: {
    page: Page;
    usersLength: number;
}) {
    const listenersCounter = page.locator(`text="${usersLength} Listeners"`);
    await expect(listenersCounter).toBeVisible();
    await expect(listenersCounter).toBeEnabled();

    await listenersCounter.click();

    await expect(page.locator('text="Users list"').last()).toBeVisible();
}

async function openUserProfileFromMtvUsersList({
    page,
    userNickname,
    userID,
}: {
    page: Page;
    userNickname: string;
    userID: string;
}) {
    const userCard = page
        .locator(`css=[data-testid="${userNickname}-user-card"]`)
        .last();
    await expect(userCard).toBeVisible({
        timeout: 30000,
    });

    await userCard.click();

    await expect(
        page
            .locator(`css=[data-testid="${userID}-profile-page-screen"]`)
            .last(),
    ).toBeVisible();
}

async function minimizeMusicPlayer({ page }: { page: Page }) {
    const hideFullscreenButton = page.locator(
        'css=[aria-label="Minimize the music player"]',
    );
    await expect(hideFullscreenButton).toBeVisible();
    await expect(hideFullscreenButton).toBeEnabled();
    await hideFullscreenButton.click();
}

/**
 * test-A/
 * UserA opens the app
 * UserB opens the app
 * UserA creates MTV room
 * UserB joins the UserA mtv room via the Mtv room search engine
 * UserB goes to the Mtv room users list, and hit the UserA user card, he should see the UserA profile, following, followers, playlists counters and follow button.
 * UserA goes on home
 * UserA goes to his profile
 * UserA goes to his settings
 * UserA edit his nickname
 * UserA change his relations visibility to follower-only, and his playlists visibility to private
 * UserB goes back and hit the UserA card again, he should now see the new UserA nickname and should not be able to see his follower & following & playlists counters information
 * UserB follows the UserA, he should now see the unfollow button and should be able to retrieve UserA relations profile information
 */

test('Profile test-a', async ({ browser }) => {
    //This test is not protected from black box testing
    //To avoid conflicts with previous tests, ftm workaround is to user specific profile group e2e tests userIndex 2 & 3
    const {
        page: userAPage,
        userID: userAUserID,
        userNickname: userANickname,
    } = await setupAndGetUserPage({
        browser,
        knownSearches,
        userIndex: 2,
    });

    const {
        page: userBPage,
        userID: userBUserID,
        userNickname: userBNickname,
    } = await setupAndGetUserPage({
        browser,
        knownSearches,
        userIndex: 3,
    });

    const { roomName } = await createMtvRoom({
        creatorPage: userAPage,
    });

    await joinMtvRoom({
        joinerPage: userBPage,
        roomName,
    });

    await userGoesToTheMtvUsersListFromFullscreenPlayer({
        page: userBPage,
        usersLength: 2,
    });

    await openUserProfileFromMtvUsersList({
        page: userBPage,
        userNickname: userANickname,
        userID: userAUserID,
    });

    //UserB looking on UserA profile page
    {
        const allUserProfileInformationElements = userBPage.locator(
            withinMyUserProfilePageContainer({
                userID: userAUserID,
                selector: 'css=[data-testid$="user-profile-information"]',
            }),
        );
        await expect(allUserProfileInformationElements).toHaveCount(3);

        const userANicknameText = userBPage
            .locator(`text="${userANickname} profile"`)
            .last();
        await expect(userANicknameText).toBeVisible();

        const followerCounter = userBPage.locator(`text="followers 0"`).last();
        await expect(followerCounter).toBeVisible();

        const followingCounter = userBPage.locator(`text="following 0"`).last();
        await expect(followingCounter).toBeVisible();

        const playlistsCounter = userBPage.locator(`text="playlists 0"`).last();
        await expect(playlistsCounter).toBeVisible();

        const followButton = userBPage
            .locator(`css=[data-testid="follow-${userAUserID}-button"]`)
            .last();
        await expect(followButton).toBeVisible();
    }

    await minimizeMusicPlayer({
        page: userAPage,
    });

    await goToHomeTabScreen({
        page: userAPage,
    });

    await goToMyProfileFromHomeTab({
        page: userAPage,
    });

    //UserA look to his myProfilePage
    {
        const myFollowerCounter = userAPage
            .locator(`text="followers 0"`)
            .last();
        await expect(myFollowerCounter).toBeVisible();

        const myFollowingCounter = userAPage
            .locator(`text="following 0"`)
            .last();
        await expect(myFollowingCounter).toBeVisible();

        const myPlaylistsCounter = userAPage
            .locator(`text="playlists 0"`)
            .last();
        await expect(myPlaylistsCounter).toBeVisible();

        const myDevicesPlaylistCounter = userAPage
            .locator(`text="devices 1"`)
            .last();
        await expect(myDevicesPlaylistCounter).toBeVisible();
    }

    await goToMyProfileSettingsFromMyProfileScreen({
        page: userAPage,
    });

    //Note: not looking if selected end of test will verify it
    const playlistsVisibilityPrivateOption = userAPage
        .locator(withinPlaylistsVisibilityContainer(`text="Private"`))
        .last();
    await expect(playlistsVisibilityPrivateOption).toBeVisible();
    await playlistsVisibilityPrivateOption.click();

    const relationsVisibilityFollowerOnlyOption = userAPage
        .locator(withinRelationsVisibilityContainer(`text="Followers only"`))
        .last();
    await expect(relationsVisibilityFollowerOnlyOption).toBeVisible();
    await relationsVisibilityFollowerOnlyOption.click();

    await goToEditMyNicknameFromMyProfileScreen({
        page: userAPage,
        userNickname: userANickname,
    });

    const newUserANickname = internet.userName();
    await userAPage.fill(`css=[value="${userANickname}"]`, newUserANickname);

    const submitButton = userAPage.locator(
        withinEditMyNicknameContainer(`text="Submit"`),
    );
    await expect(submitButton).toBeVisible();

    await Promise.all([
        expect(
            userAPage.locator(`text="Nickname updated successfully"`),
        ).toBeVisible(),
        submitButton.click(),
    ]);

    await hitGoBack({
        page: userBPage,
        afterGoBackAssertion: async () => {
            await expect(
                userBPage.locator('text="Users list"').last(),
            ).toBeVisible();
        },
    });

    await openUserProfileFromMtvUsersList({
        page: userBPage,
        userNickname: userANickname,
        userID: userAUserID,
    });

    {
        const allUserProfileInformationElements = userBPage.locator(
            withinMyUserProfilePageContainer({
                userID: userAUserID,
                selector: 'css=[data-testid$="user-profile-information"]',
            }),
        );
        await expect(allUserProfileInformationElements).toHaveCount(2);

        const userANicknameText = userBPage
            .locator(`text="${newUserANickname} profile"`)
            .last();
        await expect(userANicknameText).toBeVisible();

        const followerCounter = userBPage.locator(`text="followers 1"`).last();
        await expect(followerCounter).toBeVisible();

        const followingCounter = userBPage.locator(`text="following 0"`).last();
        await expect(followingCounter).toBeVisible();

        const followButton = userBPage
            .locator(`css=[data-testid="follow-${userAUserID}-button"]`)
            .last();
        await expect(followButton).toBeVisible();
    }
});
