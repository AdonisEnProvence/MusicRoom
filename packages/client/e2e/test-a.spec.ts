import { test, expect, Browser, Page, Locator } from '@playwright/test';

function assertIsNotUndefined<ValueType>(
    value: ValueType | undefined,
): asserts value is ValueType {
    if (value === undefined) {
        throw new Error('value must not be undefined');
    }
}

const AVAILABLE_USERS_LIST = [
    '8d71dcb3-9638-4b7a-89ad-838e2310686c',
    '71bc3025-b765-4f84-928d-b4dca8871370',
    'd125ecde-b0ee-4ab8-a488-c0e7a8dac7c5',
    '7f4bc598-c5be-4412-acc4-515a87b797e7',
];

async function setupCreatorPages({ browser }: { browser: Browser }) {
    const creatorContext = await browser.newContext({
        storageState: {
            cookies: [],
            origins: [
                {
                    origin: 'http://localhost:4000',
                    localStorage: [
                        {
                            name: 'USER_ID',
                            value: AVAILABLE_USERS_LIST[0],
                        },
                    ],
                },
            ],
        },
    });
    const creatorPage = await creatorContext.newPage();

    await creatorPage.goto('/');

    return {
        creatorPage,
    };
}

async function setupJoinerPages({ browser }: { browser: Browser }) {
    const joinerContext = await browser.newContext({
        storageState: {
            cookies: [],
            origins: [
                {
                    origin: 'http://localhost:4000',
                    localStorage: [
                        {
                            name: 'USER_ID',
                            value: AVAILABLE_USERS_LIST[1],
                        },
                    ],
                },
            ],
        },
    });
    const joinerPage = await joinerContext.newPage();

    await joinerPage.goto('/');

    return {
        joinerPage,
    };
}

async function createRoom({ creatorPage }: { creatorPage: Page }) {
    const focusTrap = creatorPage.locator('text="Click"').first();
    await focusTrap.click();

    await expect(creatorPage.locator('text="Home"').first()).toBeVisible();

    const goToTracksSearch = creatorPage.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = 'BB Brunes';
    await creatorPage.fill('css=[placeholder*="Search a track"]', trackQuery);
    await creatorPage.keyboard.press('Enter');

    await expect(creatorPage.locator('text="Results"')).toBeVisible();

    const firstMatchingSong = creatorPage.locator('text=BB Brunes').first();
    const selectedSongTitle = await firstMatchingSong.textContent();
    await expect(firstMatchingSong).toBeVisible();

    await firstMatchingSong.click();

    await expect(
        creatorPage.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    const roomName = 'MusicRoom is the best';
    await creatorPage.fill(
        'css=[placeholder="Francis Cabrel OnlyFans"]',
        roomName,
    );
    await creatorPage.click('text="Next" >> visible=true');

    await expect(
        creatorPage.locator('text="What is the opening status of the room?"'),
    ).toBeVisible();

    const publicMode = creatorPage.locator(
        'css=[aria-selected="true"] >> text="Public"',
    );
    await expect(publicMode).toBeVisible();
    await creatorPage.click('text="Next" >> visible=true');

    const noVotingRestriction = creatorPage.locator(
        'css=[aria-selected="true"] >> text="No restriction"',
    );
    await expect(noVotingRestriction).toBeVisible();
    await creatorPage.click('text="Next" >> visible=true');

    const broadcastMode = creatorPage.locator(
        'css=[aria-selected="true"] >> text="Broadcast"',
    );
    await expect(broadcastMode).toBeVisible();
    await creatorPage.click('text="Next" >> visible=true');

    const twoVotesConstraintButton = creatorPage.locator(
        `text="Friendly online event"`,
    );
    await expect(twoVotesConstraintButton).toBeVisible();
    await twoVotesConstraintButton.click();

    await creatorPage.click('text="Next" >> visible=true');

    await expect(
        creatorPage.locator('text="Confirm room creation"'),
    ).toBeVisible();
    const elementWithSelectedSongTitle = creatorPage.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(elementWithSelectedSongTitle).toBeVisible();

    await creatorPage.click('text="Next" >> visible=true');

    // We expect creation form to have disappeared
    // and user to have not been redirected to another screen than
    // the one in which she opened the form.
    await expect(creatorPage.locator('text="Results"').first()).toBeVisible();

    const miniPlayerWithRoomName = creatorPage
        .locator(`text="${roomName}"`)
        .first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    const miniPlayerWithSelectedSong = creatorPage.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(miniPlayerWithSelectedSong).toBeVisible();

    await miniPlayerWithRoomName.click();

    return {
        roomName,
    };
}

async function joinerJoinsRoom({
    joinerPage,
    roomName,
}: {
    joinerPage: Page;
    roomName: string;
}) {
    const focusTrap = joinerPage.locator('text="Click"').first();
    await focusTrap.click();

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

    // Close MTV Search
    await joinerPage.click('css=[aria-label="Go back"] >> visible=true');

    // Open player full screen
    const miniPlayerWithRoomName = joinerPage
        .locator(`text="${roomName}"`)
        .first();
    await expect(miniPlayerWithRoomName).toBeVisible();

    await miniPlayerWithRoomName.click();
}

async function joinerSuggestsTrack({ joinerPage }: { joinerPage: Page }) {
    const suggestTrackButton = joinerPage.locator(
        'css=[aria-label="Suggest a track"]',
    );
    await expect(suggestTrackButton).toBeVisible();

    await suggestTrackButton.click();

    await expect(
        joinerPage.locator('text="Suggest Track" >> visible=true'),
    ).toBeVisible();

    const searchTrackInput = joinerPage.locator(
        'css=[placeholder*="Search a track"]',
    );
    await expect(searchTrackInput).toBeVisible();

    const searchedTrackName = 'Biolay - Vendredi 12';
    await searchTrackInput.fill(searchedTrackName);
    await joinerPage.keyboard.press('Enter');

    await expect(joinerPage.locator('text="Results"')).toBeVisible();

    const firstMatchingSong = joinerPage
        .locator(`text=${searchedTrackName}`)
        .first();
    await expect(firstMatchingSong).toBeVisible();

    const selectedSongTitle = await firstMatchingSong.textContent();
    if (selectedSongTitle === null) {
        throw new Error('Selected song is empty');
    }

    await firstMatchingSong.click();

    const successfulToast = joinerPage.locator(
        'text=Your suggestion has been accepted',
    );
    await expect(successfulToast).toBeVisible();

    const suggestTrackInTracksList = joinerPage.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(suggestTrackInTracksList).toBeVisible();

    console.log('selectedSongTitle', selectedSongTitle);

    return {
        joinerSuggestedTrack: selectedSongTitle,
    };
}

async function creatorVotesForTrack({
    creatorPage,
    trackToVoteFor,
}: {
    creatorPage: Page;
    trackToVoteFor: string;
}) {
    const trackToVoteForElement = creatorPage.locator(`text=${trackToVoteFor}`);
    await expect(trackToVoteForElement).toBeVisible();

    await trackToVoteForElement.click();
}

async function creatorPausesTrack({
    creatorPage,
    joinerPage,
}: {
    creatorPage: Page;
    joinerPage: Page;
}) {
    const pauseButton = creatorPage
        .locator('css=[aria-label="Pause the video"]:not(:disabled)')
        .first();
    await expect(pauseButton).toBeVisible();

    await creatorPage.waitForTimeout(5_000);

    await pauseButton.click().then(() => {
        console.log('pause button clicked');
    });

    await Promise.all([
        expect(
            creatorPage.locator('text="Play the video"').first(),
        ).toBeVisible(),
        expect(
            joinerPage.locator('text="Play the video"').first(),
        ).toBeVisible(),
    ]);
}

test('Room creation', async ({ browser }) => {
    const [{ creatorPage }, { joinerPage }] = await Promise.all([
        setupCreatorPages({ browser }),
        setupJoinerPages({ browser }),
    ]);

    const { roomName } = await createRoom({ creatorPage });

    await joinerJoinsRoom({ joinerPage, roomName });

    const { joinerSuggestedTrack } = await joinerSuggestsTrack({ joinerPage });

    await Promise.all([
        /**
         * At time of writing (11-01-2021), a request is made by YouTube player to
         * https://r1---sn-a0jpm-a0ms.googlevideo.com/videoplayback when launching a video.
         */
        creatorPage.waitForResponse((response) =>
            response.url().includes('videoplayback'),
        ),
        joinerPage.waitForResponse((response) =>
            response.url().includes('videoplayback'),
        ),

        creatorVotesForTrack({
            creatorPage,
            trackToVoteFor: joinerSuggestedTrack,
        }),
    ]);

    await creatorPausesTrack({ creatorPage, joinerPage });

    await creatorPage.waitForTimeout(100_000);
});
