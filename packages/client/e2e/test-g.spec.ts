import { test, expect, Page, Locator } from '@playwright/test';
import { assertIsNotNull, assertIsNotUndefined } from './_utils/assert';
import { hitGoNextButton } from './_utils/global';
import { KnownSearchesRecord } from './_utils/mock-http';
import { closeAllContexts, setupAndGetUserPage } from './_utils/page';

async function createPrivateRoom(page: Page) {
    await expect(page.locator('text="Home"').first()).toBeVisible();

    const goToTracksSearch = page.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = 'BB Brunes';
    await page.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackQuery,
    );
    await page.keyboard.press('Enter');

    const firstMatchingSong = page.locator('text=BB Brunes').first();
    await expect(firstMatchingSong).toBeVisible();

    const selectedSongTitle = await firstMatchingSong.textContent();
    assertIsNotNull(
        selectedSongTitle,
        'The selected song must exist and have a text content',
    );

    await firstMatchingSong.click();

    await expect(
        page.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    const roomName = 'MusicRoom is the best';
    await page.fill('css=[placeholder="Francis Cabrel OnlyFans"]', roomName);
    await hitGoNextButton({
        page,
    });

    await expect(
        page.locator('text="What is the opening status of the room?"'),
    ).toBeVisible();

    const privateMode = page.locator(
        'css=[aria-selected="false"] >> text="Private"',
    );
    //need to verify that only invited user can vote is enabled
    await expect(privateMode).toBeVisible();
    await privateMode.click();
    await hitGoNextButton({
        page,
    });

    const noVotingRestriction = page.locator(
        'css=[aria-selected="true"] >> text="No restriction"',
    );
    await expect(noVotingRestriction).toBeVisible();
    await hitGoNextButton({
        page,
    });

    const broadcastMode = page.locator(
        'css=[aria-selected="true"] >> text="Broadcast"',
    );
    await expect(broadcastMode).toBeVisible();
    await hitGoNextButton({
        page,
    });

    const twoVotesConstraintButton = page.locator(
        `text="Friendly online event"`,
    );
    await expect(twoVotesConstraintButton).toBeVisible();
    await twoVotesConstraintButton.click();
    await hitGoNextButton({
        page,
    });

    await expect(page.locator('text="Confirm room creation"')).toBeVisible();
    const elementWithSelectedSongTitle = page.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(elementWithSelectedSongTitle).toBeVisible();
    await hitGoNextButton({
        page,
    });

    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    const miniPlayerWithSelectedSong = page
        .locator(`text=${selectedSongTitle}`)
        .first();
    await expect(miniPlayerWithSelectedSong).toBeVisible();

    await miniPlayerWithRoomName.click();

    return {
        roomName,
        initialTrack: selectedSongTitle,
    };
}

async function joinInvitedRoom({
    page,
    roomName,
}: {
    page: Page;
    roomName: string;
}) {
    await page.click('text="Go to Music Track Vote"');

    // Code to use infinite scroll
    let matchingRoom: Locator | undefined;
    let hasFoundRoom = false;

    await page.mouse.move((page.viewportSize()?.width ?? 0) / 2, 150);
    while (hasFoundRoom === false) {
        await page.mouse.wheel(0, 999999);

        matchingRoom = page.locator(`text="${roomName}"`).first();
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

    // Close MTV Search
    await page.click('css=[aria-label="Go back"] >> visible=true');

    // Open player full screen
    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();

    await miniPlayerWithRoomName.click();
}

async function inviteUser({
    page,
    userName,
}: {
    page: Page;
    userName: string;
}) {
    const listenersCount = page.locator('text=Listeners');
    await listenersCount.click();

    const usersListScreenTitle = page.locator('text="Users list"');
    await expect(usersListScreenTitle).toBeVisible();

    const inviteUserButton = page.locator('css=[aria-label="Invite a user"]');
    await inviteUserButton.click();

    const usersSearchScreenTitle = page.locator('text="Users search"');
    await expect(usersSearchScreenTitle).toBeVisible();

    const usersSearch = page.locator(
        'css=[placeholder^="Search a user by name"] >> visible=true >> nth=-1',
    );
    await usersSearch.click();
    await usersSearch.fill(userName);

    const userCard = page.locator(`text=${userName}`);
    await expect(userCard).toBeVisible();

    await userCard.click();

    const hasBeenInvitedIcon = page.locator(
        `css=[data-testid="${userName}-user-card"] [aria-label="Has been invited"]`,
    );
    await expect(hasBeenInvitedIcon).toBeVisible();
}

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

test('Test G', async ({ browser }) => {
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
    const [{ page: userAPage }, { page: userBPage, userNickname: userBName }] =
        await Promise.all([
            setupAndGetUserPage({ browser, userIndex: 0, knownSearches }),
            setupAndGetUserPage({ browser, userIndex: 1, knownSearches }),
        ]);

    const { roomName } = await createPrivateRoom(userAPage);

    await inviteUser({ page: userAPage, userName: userBName });

    await joinInvitedRoom({
        page: userBPage,
        roomName,
    });
});
