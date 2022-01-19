import { test, expect, Page, Locator } from '@playwright/test';
import { lorem } from 'faker';
import { assertIsNotUndefined } from '../_utils/assert';
import { hitGoNextButton } from '../_utils/global';
import { KnownSearchesRecord } from '../_utils/mock-http';
import { closeAllContexts, setupAndGetUserPage } from '../_utils/page';

type FindMiniPlayerWithRoomNameAndGoFullscreenArgs = {
    roomName: string;
    page: Page;
};
async function findMiniPlayerWithRoomNameAndGoFullscreen({
    page,
    roomName,
}: FindMiniPlayerWithRoomNameAndGoFullscreenArgs) {
    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    await miniPlayerWithRoomName.click();
}

type CreateRoomArgs = { creatorPage: Page; trackName: string };
async function createDirectRoomAndGoFullscreen({
    creatorPage,
    trackName,
}: CreateRoomArgs) {
    await expect(creatorPage.locator('text="Home"').first()).toBeVisible();

    //Searching for a track
    const goToTracksSearch = creatorPage.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = trackName;
    await creatorPage.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackQuery,
    );
    await creatorPage.keyboard.press('Enter');

    //I have no idea why but text selector below have to be written without \"\"
    const firstMatchingSong = creatorPage.locator(`text=${trackName}`).first();
    const selectedSongTitle = await firstMatchingSong.textContent();
    if (selectedSongTitle === null) {
        throw new Error('SelectedSongTitle is null');
    }
    await expect(firstMatchingSong).toBeVisible();

    await firstMatchingSong.click();

    const createMtvRoomModalButton = creatorPage.locator('text="Create MTV"');
    await createMtvRoomModalButton.click();

    /** Entering the mtv room creation form **/
    //RoomName
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

    //Room isOpen
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

    //Voting restrictions
    const noVotingRestriction = creatorPage.locator(
        'css=[aria-selected="true"] >> text="No restriction"',
    );
    await expect(noVotingRestriction).toBeVisible();
    await hitGoNextButton({
        page: creatorPage,
    });

    //Room mode
    const directMode = creatorPage.locator(
        'css=[aria-selected="false"] >> text="Direct"',
    );
    await expect(directMode).toBeVisible();
    await directMode.click();
    await hitGoNextButton({
        page: creatorPage,
    });

    //Minimum count to be played
    const smallestVotesConstraint = creatorPage.locator(
        `css=[aria-selected="false"] >> text="Friendly online event"`,
    );
    await expect(smallestVotesConstraint).toBeVisible();
    await smallestVotesConstraint.click();
    await hitGoNextButton({
        page: creatorPage,
    });

    //Confirmation
    await expect(
        creatorPage.locator('text="Confirm room creation"'),
    ).toBeVisible();
    const elementWithSelectedSongTitle = creatorPage.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(elementWithSelectedSongTitle).toBeVisible();
    await hitGoNextButton({
        page: creatorPage,
    });

    ///

    return {
        roomName,
        selectedSongTitle,
    };
}

type JoinGivenRoomAndGoFullscreenArgs = {
    joiningUserPage: Page;
    roomName: string;
    expectedListenersCounterValue: number;
};
async function userJoinsGivenRoomAndGoFullscreen({
    joiningUserPage,
    roomName,
    expectedListenersCounterValue,
}: JoinGivenRoomAndGoFullscreenArgs) {
    await joiningUserPage.click('text="Go to Music Track Vote"');

    // Code to use infinite scroll
    let matchingRoom: Locator | undefined;
    let hasFoundRoom = false;

    await joiningUserPage.mouse.move(
        (joiningUserPage.viewportSize()?.width ?? 0) / 2,
        150,
    );
    while (hasFoundRoom === false) {
        await joiningUserPage.mouse.wheel(0, 999999);

        matchingRoom = joiningUserPage.locator(`text="${roomName}"`).first();
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

    const expectedListenersCounterAriaLabel = `${expectedListenersCounterValue} Listeners`;
    await expect(
        joiningUserPage.locator(
            `text="${expectedListenersCounterAriaLabel}" >> visible=true`,
        ),
    ).toBeVisible();
}

type UserGoesToTheUsersListFromFullscreenPlayerArgs = {
    page: Page;
    usersLength: number;
};
async function userGoesToTheUsersListFromFullscreenPlayer({
    page,
    usersLength,
}: UserGoesToTheUsersListFromFullscreenPlayerArgs) {
    const listenersCounter = page.locator(`text="${usersLength} Listeners"`);
    await expect(listenersCounter).toBeVisible();
    await expect(listenersCounter).toBeEnabled();

    await listenersCounter.click();

    await expect(page.locator('text="Users list"')).toBeVisible();
}

type GoToUserSettingsArgs = {
    page: Page;
    userNickname: string;
};
async function openUserSettingsFromUsersList({
    page,
    userNickname,
}: GoToUserSettingsArgs) {
    const userCard = page.locator(
        `css=[data-testid="${userNickname}-user-card"]`,
    );
    await expect(userCard).toBeVisible();
    const userCardThreeDotsButton = page.locator(
        `css=[aria-label="Open user ${userNickname} settings"]`,
    );
    await expect(userCardThreeDotsButton).toBeVisible();
    await expect(userCardThreeDotsButton).toBeEnabled();

    await userCardThreeDotsButton.click();

    const userBottomSheetModalSettings = page.locator(
        `text="${userNickname} settings"`,
    );
    await expect(userBottomSheetModalSettings).toBeVisible();
}

async function openUserSettingsAndToggleOnControlDelegationPermission({
    page,
    userNickname,
}: GoToUserSettingsArgs) {
    await openUserSettingsFromUsersList({
        page,
        userNickname,
    });

    const controlAndDelegationSwitch = page.locator(
        `css=[aria-label="Set delegation and control permission"] >> visible=true`,
    );
    await expect(controlAndDelegationSwitch).toBeVisible();
    await controlAndDelegationSwitch.click();

    const controlAndDelegationSwitchCopy = page.locator(
        `css=[aria-label="Remove delegation and control permission"] >> visible=true`,
    );
    await expect(controlAndDelegationSwitchCopy).toBeVisible();
}

/**
 * /!\ Should be called from the music player fullscreen /!\
 */
async function userGoesToTheChatFromMusicPlayerFullscreen({
    page,
}: {
    page: Page;
}) {
    const chatButton = page.locator('text="Chat"');
    await expect(chatButton).toBeVisible();
    await expect(chatButton).toBeEnabled();

    await chatButton.click();
    await expect(
        page.locator('css=[data-testid="mtv-chat-screen"]'),
    ).toBeVisible();
}

async function userHitsLastVisibleGoBackButton({ page }: { page: Page }) {
    const goBackButton = page
        .locator('css=[aria-label="Go back"] >> visible=true')
        .last();
    await expect(goBackButton).toBeVisible();
    await goBackButton.click();
}

/**
 * /!\ Should be called from chat screen modal /!\
 */
async function userSendMessageInTheChat({
    page,
    message,
}: {
    page: Page;
    message: string;
}) {
    await page.fill(
        'css=[placeholder*="Write a message"] >> visible=true',
        message,
    );
    await page.keyboard.press('Enter');

    expect(await page.locator(`text="${message}"`).count()).toBe(1);
    await expect(page.locator(`text="${message}"`)).toBeVisible();
}

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

test('Test E see following link for more information: https://3.basecamp.com/4704981/buckets/22220886/messages/4292491228#:~:text=Test%20end-,Test%20E/,-UserA%20Section%20full', async ({
    browser,
}) => {
    const knownSearches: KnownSearchesRecord = {
        'BB Brunes': [
            {
                id: 'X3VNRVo7irM',
                title: 'BB BRUNES - Dis-Moi [Clip Officiel]',
                artistName: 'BBBrunesMusic',
                duration: 0,
            },
            {
                id: 'mF5etHMRMMM',
                title: 'BB BRUNES - Coups et Blessures [Clip Officiel]',
                artistName: 'BBBrunesMusic',
                duration: 0,
            },
            {
                id: '1d3etBBSSfw',
                title: 'BB BRUNES - Lalalove You [Clip Officiel]',
                artistName: 'BBBrunesMusic',
                duration: 0,
            },
            {
                id: 'DyRDeEWhW6M',
                title: 'BB BRUNES - Aficionado [Clip Officiel]',
                artistName: 'BBBrunesMusic',
                duration: 0,
            },
            {
                id: 'Qs-ucIS2B-0',
                title: 'BB BRUNES - Stéréo [Clip Officiel]',
                artistName: 'BBBrunesMusic',
                duration: 0,
            },
        ],
    };

    let userIndex = 0;
    const [
        { page: creatorUserA, userNickname: creatorUserANickname },
        {
            page: joiningUserB,
            userNickname: joiningUserBNickname,
            userID: joiningUserBID,
        },
    ] = await Promise.all([
        setupAndGetUserPage({
            browser,
            userIndex: userIndex++,
            knownSearches,
        }),
        setupAndGetUserPage({
            browser,
            userIndex: userIndex++,
            knownSearches,
        }),
    ]);

    //UserA creates the room
    const { roomName } = await createDirectRoomAndGoFullscreen({
        creatorPage: creatorUserA,
        trackName: 'BB Brunes',
    });

    //UserA goes to the users list he should find only himself
    await userGoesToTheUsersListFromFullscreenPlayer({
        page: creatorUserA,
        usersLength: 1,
    });
    await expect(
        creatorUserA.locator(
            `css=[data-testid="${creatorUserANickname}-user-card"]`,
        ),
    ).toBeVisible();
    // expect(await creatorUserA.locator(`_react=UserListItem`).count()).toBe(1);

    //UserB joins the room
    await userJoinsGivenRoomAndGoFullscreen({
        joiningUserPage: joiningUserB,
        roomName,
        expectedListenersCounterValue: 2,
    });

    //UserA should now see the userB user card
    await expect(
        creatorUserA.locator(
            `css=[data-testid="${joiningUserBNickname}-user-card"]`,
        ),
    ).toBeVisible();

    //UserA filters using first userB nickname letters, he should only see his card
    await creatorUserA.fill(
        'css=[placeholder*="Search a user by name"] >> visible=true',
        joiningUserBNickname.slice(0, 3),
    );
    await creatorUserA.keyboard.press('Enter');

    const userBcard = creatorUserA.locator(
        `css=[data-testid="${joiningUserBNickname}-user-card"]`,
    );
    await expect(userBcard).toBeVisible();

    await expect(
        creatorUserA.locator(
            `css=[data-testid="${creatorUserANickname}-user-card"]`,
        ),
    ).not.toBeVisible();

    //UserA hits the userBcard, he should see the userB profile
    await userBcard.click();
    await expect(
        creatorUserA.locator(`text="${joiningUserBID} Profile Screen"`),
    ).toBeVisible();

    //UserA goes back, the results should still be filtered
    await userHitsLastVisibleGoBackButton({
        page: creatorUserA,
    });

    await expect(creatorUserA.locator('text="Users list"')).toBeVisible();
    await expect(
        creatorUserA.locator(
            `css=[data-testid="${creatorUserANickname}-user-card"]`,
        ),
    ).not.toBeVisible();

    //UserB opens the chat modal
    await userGoesToTheChatFromMusicPlayerFullscreen({
        page: joiningUserB,
    });

    //UserB sends a message in the chat
    const userBMessage = lorem.sentence();
    await userSendMessageInTheChat({
        page: joiningUserB,
        message: userBMessage,
    });

    //UserA goes back he should see the music player fullscreen
    const usersListCancelButton = creatorUserA
        .locator('text="Cancel" >> visible=true')
        .last();
    await expect(usersListCancelButton).toBeVisible();
    await usersListCancelButton.click();
    await userHitsLastVisibleGoBackButton({
        page: creatorUserA,
    });

    const expectedListenersCounterAriaLabel = `2 Listeners`;
    await expect(
        creatorUserA.locator(
            `text="${expectedListenersCounterAriaLabel}" >> visible=true`,
        ),
    ).toBeVisible();

    //UserA goes to the chat, he should be able to see the userB message
    await userGoesToTheChatFromMusicPlayerFullscreen({
        page: creatorUserA,
    });
    await expect(creatorUserA.locator(`text="${userBMessage}"`)).toBeVisible();

    //UserA sends a message in the chat, userB should be able to see userA message
    const userAMessage = lorem.sentence() + 'userA_identifier';
    await userSendMessageInTheChat({
        page: creatorUserA,
        message: userAMessage,
    });
    await expect(joiningUserB.locator(`text="${userAMessage}"`)).toBeVisible();
});
