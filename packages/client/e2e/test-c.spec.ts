import { test, expect, Browser, Page, Locator } from '@playwright/test';
import { assertIsNotNull, assertIsNotUndefined } from './_utils/assert';
import { mockSearchTracks } from './_utils/mock-http';
import { waitForYouTubeVideoToLoad } from './_utils/wait-youtube';

const AVAILABLE_USERS_LIST = [
    {
        uuid: '8d71dcb3-9638-4b7a-89ad-838e2310686c',
        nickname: 'Francis',
    },
    {
        uuid: '71bc3025-b765-4f84-928d-b4dca8871370',
        nickname: 'Moris',
    },
    {
        uuid: 'd125ecde-b0ee-4ab8-a488-c0e7a8dac7c5',
        nickname: 'Leila',
    },
    {
        uuid: '7f4bc598-c5be-4412-acc4-515a87b797e7',
        nickname: 'Manon',
    },
];

async function setupPage({
    browser,
    index,
}: {
    browser: Browser;
    index: number;
}) {
    const user = AVAILABLE_USERS_LIST[index];
    const context = await browser.newContext({
        storageState: {
            cookies: [],
            origins: [
                {
                    origin: 'http://localhost:4000',
                    localStorage: [
                        {
                            name: 'USER_ID',
                            value: user.uuid,
                        },
                    ],
                },
            ],
        },
    });
    await mockSearchTracks({
        context,
        knownSearches: {
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
        },
    });
    const page = await context.newPage();

    await page.goto('/');

    const focusTrap = page.locator('text="Click"').first();
    await focusTrap.click();

    return {
        page,
        userName: user.nickname,
    };
}

async function createPublicRoomWithInvitation(page: Page) {
    await expect(page.locator('text="Home"').first()).toBeVisible();

    const goToTracksSearch = page.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = 'BB Brunes';
    await page.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackQuery,
    );
    await page.keyboard.press('Enter');

    await expect(page.locator('text="Results"')).toBeVisible();

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
    await page.click('text="Next" >> visible=true');

    await expect(
        page.locator('text="What is the opening status of the room?"'),
    ).toBeVisible();

    const publicMode = page.locator(
        'css=[aria-selected="true"] >> text="Public"',
    );
    await expect(publicMode).toBeVisible();
    const invitationModeSwitch = page.locator('css=[role="switch"]');
    await invitationModeSwitch.click();
    await page.click('text="Next" >> visible=true');

    const noVotingRestriction = page.locator(
        'css=[aria-selected="true"] >> text="No restriction"',
    );
    await expect(noVotingRestriction).toBeVisible();
    await page.click('text="Next" >> visible=true');

    const broadcastMode = page.locator(
        'css=[aria-selected="true"] >> text="Broadcast"',
    );
    await expect(broadcastMode).toBeVisible();
    await page.click('text="Next" >> visible=true');

    const twoVotesConstraintButton = page.locator(
        `text="Friendly online event"`,
    );
    await expect(twoVotesConstraintButton).toBeVisible();
    await twoVotesConstraintButton.click();

    await page.click('text="Next" >> visible=true');

    await expect(page.locator('text="Confirm room creation"')).toBeVisible();
    const elementWithSelectedSongTitle = page.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(elementWithSelectedSongTitle).toBeVisible();

    await page.click('text="Next" >> visible=true');

    // We expect creation form to have disappeared
    // and user to have not been redirected to another screen than
    // the one in which she opened the form.
    await expect(page.locator('text="Results"').first()).toBeVisible();

    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    const miniPlayerWithSelectedSong = page.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(miniPlayerWithSelectedSong).toBeVisible();

    await miniPlayerWithRoomName.click();

    return {
        roomName,
        initialTrack: selectedSongTitle,
    };
}

async function joinRoom({ page, roomName }: { page: Page; roomName: string }) {
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

    await miniPlayerWithRoomName.click();
}

test('Test C', async ({ browser }) => {
    const [
        { page: userAPage, userName: userAName },
        { page: userBPage },
        { page: userCPage, userName: userCName },
    ] = await Promise.all([
        setupPage({ browser, index: 0 }),
        setupPage({ browser, index: 1 }),
        setupPage({ browser, index: 2 }),
    ]);

    const { roomName, initialTrack } = await createPublicRoomWithInvitation(
        userAPage,
    );

    await joinRoom({ page: userBPage, roomName });

    await voteForTrackInMusicPlayerFullScreen({
        page: userBPage,
        trackToVoteFor: initialTrack,
    });

    await Promise.all([
        inviteUser({ page: userAPage, userName: userCName }),

        pressRoomInvitationToast({
            page: userCPage,
            inviterUserName: userAName,
            roomName,
        }),
    ]);

    await Promise.all([
        voteForTrackInMusicPlayerFullScreen({
            page: userCPage,
            trackToVoteFor: initialTrack,
        }),

        waitForYouTubeVideoToLoad(userAPage),
        waitForYouTubeVideoToLoad(userBPage),
        waitForYouTubeVideoToLoad(userCPage),
    ]);
});
