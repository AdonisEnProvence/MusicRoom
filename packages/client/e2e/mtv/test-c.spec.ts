import { test, expect, Page, Locator } from '@playwright/test';
import {
    assertIsNotNull,
    assertIsNotUndefined,
    assertMusicPlayerStatusIs,
} from '../_utils/assert';
import { hitGoNextButton } from '../_utils/global';
import {
    getAppHomeButtonLocator,
    getAppSearchButtonLocator,
    knownSearches,
} from '../_utils/mpe-e2e-utils';
import { closeAllContexts, setupPageAndSignUpUser } from '../_utils/page';
import { waitForYouTubeVideoToLoad } from '../_utils/wait-youtube';

async function createPublicRoomWithInvitation(page: Page) {
    await expect(page.locator(getAppHomeButtonLocator())).toBeVisible();

    const goToTracksSearch = page.locator(getAppSearchButtonLocator());
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

    const createMtvRoomModalButton = page.locator('text="Create MTV"');
    await createMtvRoomModalButton.click();

    await expect(
        page.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    const roomName = 'MusicRoom is the best';
    await page.fill('css=[placeholder="Room name"]', roomName);
    await hitGoNextButton({
        page,
    });

    await expect(
        page.locator('text="What is the opening status of the room?"'),
    ).toBeVisible();

    const publicMode = page.locator(
        'css=[aria-selected="true"] >> text="Public"',
    );
    await expect(publicMode).toBeVisible();
    const invitationModeSwitch = page.locator('css=[role="switch"]');
    await invitationModeSwitch.click();
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
    const elementWithSelectedSongTitle = page
        .locator(`text=${selectedSongTitle}`)
        .first();
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

    return {
        roomName,
        initialTrackTitle: selectedSongTitle,
    };
}

async function joinRoom({
    page,
    roomName,
    expectedListenersCounter,
}: {
    page: Page;
    roomName: string;
    expectedListenersCounter: number;
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

    const expectedListenersCounterAriaLabel = `${expectedListenersCounter} Listeners`;
    await expect(
        page.locator(
            `text="${expectedListenersCounterAriaLabel}" >> visible=true`,
        ),
    ).toBeVisible();
}

async function voteForTrackInMusicPlayerFullScreen({
    page,
    trackToVoteFor,
}: {
    page: Page;
    trackToVoteFor: string;
}) {
    const trackToVoteForElement = page.locator(`text=${trackToVoteFor}`);
    await expect(trackToVoteForElement).toBeVisible();

    await trackToVoteForElement.click();
}

async function inviteUserAndGoBackTwice({
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

    //UserA goes back he should see the music player fullscreen
    const usersListCancelButton = page.locator('text="Cancel"').last();
    await expect(usersListCancelButton).toBeVisible();
    await usersListCancelButton.click();
    await userHitsLastVisibleGoBackButton({
        page,
    });
    await userHitsLastVisibleGoBackButton({
        page,
    });
}

async function userHitsLastVisibleGoBackButton({ page }: { page: Page }) {
    const goBackButton = page
        .locator('css=[aria-label="Go back"] >> visible=true')
        .last();
    await expect(goBackButton).toBeVisible();
    await goBackButton.click();
}

async function pressRoomInvitationToast({
    page,
    inviterUserName,
    roomName,
}: {
    page: Page;
    inviterUserName: string;
    roomName: string;
}) {
    const invitationToast = page.locator(
        `text="${inviterUserName} sent you an invitation"`,
    );
    await expect(invitationToast).toBeVisible();

    await invitationToast.click();

    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();
}

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

test('Test C', async ({ browser }) => {
    const [
        { page: userAPage, userNickname: userAName },
        { page: userBPage },
        { page: userCPage, userNickname: userCName },
    ] = await Promise.all([
        setupPageAndSignUpUser({ browser, knownSearches }),
        setupPageAndSignUpUser({ browser, knownSearches }),
        setupPageAndSignUpUser({ browser, knownSearches }),
    ]);

    const { roomName, initialTrackTitle } =
        await createPublicRoomWithInvitation(userAPage);

    await joinRoom({ page: userBPage, roomName, expectedListenersCounter: 2 });

    await voteForTrackInMusicPlayerFullScreen({
        page: userBPage,
        trackToVoteFor: initialTrackTitle,
    });

    await Promise.all([
        inviteUserAndGoBackTwice({ page: userAPage, userName: userCName }),

        pressRoomInvitationToast({
            page: userCPage,
            inviterUserName: userAName,
            roomName,
        }),
    ]);

    await Promise.all([
        waitForYouTubeVideoToLoad(userAPage),
        waitForYouTubeVideoToLoad(userBPage),
        waitForYouTubeVideoToLoad(userCPage),
        voteForTrackInMusicPlayerFullScreen({
            page: userCPage,
            trackToVoteFor: initialTrackTitle,
        }),
    ]);

    await Promise.all([
        assertMusicPlayerStatusIs({
            page: userCPage,
            testID: 'music-player-playing-device-emitting',
        }),
        assertMusicPlayerStatusIs({
            page: userBPage,
            testID: 'music-player-playing-device-emitting',
        }),
        assertMusicPlayerStatusIs({
            page: userAPage,
            testID: 'music-player-playing-device-emitting',
        }),
    ]);
});
