import { test, expect, Browser, Page, Locator } from '@playwright/test';
import {
    assertIsNotNull,
    assertIsNotUndefined,
    assertMusicPlayerStatusIs,
} from './_utils/assert';
import { mockSearchTracks } from './_utils/mock-http';
import { waitForYouTubeVideoToLoad } from './_utils/wait-youtube';

test.afterEach(async ({ browser }) => await browser.close());

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
    await mockSearchTracks({
        context: creatorContext,
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
    await mockSearchTracks({
        context: joinerContext,
        knownSearches: {
            'Biolay - Vendredi 12': [
                {
                    id: 'eD-ORVUQ-pw',
                    title: 'Benjamin Biolay - Vendredi 12 (Clip Officiel)',
                    artistName: 'BenjaminBiolayVEVO',
                    duration: 0,
                },
                {
                    id: 'H8GDdTX8Cww',
                    title: 'Vendredi 12',
                    artistName: 'Benjamin Biolay - Topic',
                    duration: 0,
                },
                {
                    id: '7aW8iGoqi1o',
                    title: 'Benjamin Biolay - Vendredi 12',
                    artistName: 'Bruno Gaillardo',
                    duration: 0,
                },
                {
                    id: 'O8HyyYxbznQ',
                    title: 'Vendredi 12 - Benjamin Biolay (reprise)',
                    artistName: 'Clémence Bnt',
                    duration: 0,
                },
                {
                    id: 'LZ6EkzDQbiY',
                    title: 'Benjamin Biolay - Où est passée la tendresse (Live) - Le Grand Studio RTL',
                    artistName: 'Le Grand Studio RTL',
                    duration: 0,
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
    await creatorPage.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackQuery,
    );
    await creatorPage.keyboard.press('Enter');

    await expect(creatorPage.locator('text="Results"')).toBeVisible();

    const firstMatchingSong = creatorPage.locator('text=BB Brunes').first();
    await expect(firstMatchingSong).toBeVisible();

    const selectedSongTitle = await firstMatchingSong.textContent();
    assertIsNotNull(
        selectedSongTitle,
        'The selected song must exist and have a text content',
    );

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
        initialTrack: selectedSongTitle,
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
    const fullScreenPlayerPauseButton = creatorPage.locator(
        'css=[aria-label="Pause the video"]:not(:disabled) >> nth=1',
    );
    await expect(fullScreenPlayerPauseButton).toBeVisible();

    await fullScreenPlayerPauseButton.click();

    const fullScreenPlayerPlayButton = creatorPage.locator(
        'css=[aria-label="Play the video"] >> nth=1',
    );
    await expect(fullScreenPlayerPlayButton).toBeVisible();
    await expect(fullScreenPlayerPlayButton).toBeEnabled();

    await assertMusicPlayerStatusIs({
        page: joinerPage,
        testID: 'music-player-not-playing-device-emitting',
    });
}

async function creatorGoesToNextTrack({ creatorPage }: { creatorPage: Page }) {
    const goToNextTrackButton = creatorPage.locator(
        'css=[aria-label="Play next track"]',
    );
    await expect(goToNextTrackButton).toBeVisible();

    await goToNextTrackButton.click();
}

async function joinerVotesForInitialTrack({
    joinerPage,
    initialTrack,
}: {
    joinerPage: Page;
    initialTrack: string;
}) {
    const trackToVoteForElement = joinerPage.locator(`text=${initialTrack}`);
    await expect(trackToVoteForElement).toBeVisible();

    await trackToVoteForElement.click();
}

async function waitForVideoToBePausedForUserWithControl(page: Page) {
    const fullScreenPlayerPauseButton = page.locator(
        'css=[aria-label="Pause the video"]:not(:disabled) >> nth=1',
    );

    await expect(fullScreenPlayerPauseButton).toBeVisible();
}

test('Test A', async ({ browser }) => {
    const [{ creatorPage }, { joinerPage }] = await Promise.all([
        setupCreatorPages({ browser }),
        setupJoinerPages({ browser }),
    ]);

    const { roomName, initialTrack } = await createRoom({ creatorPage });

    await joinerJoinsRoom({ joinerPage, roomName });

    const { joinerSuggestedTrack } = await joinerSuggestsTrack({ joinerPage });

    await Promise.all([
        waitForYouTubeVideoToLoad(creatorPage),
        waitForYouTubeVideoToLoad(joinerPage),

        creatorVotesForTrack({
            creatorPage,
            trackToVoteFor: joinerSuggestedTrack,
        }),
    ]);

    await creatorPausesTrack({ creatorPage, joinerPage });

    await joinerVotesForInitialTrack({
        joinerPage,
        initialTrack,
    });

    await Promise.all([
        waitForYouTubeVideoToLoad(creatorPage),
        waitForYouTubeVideoToLoad(joinerPage),

        creatorGoesToNextTrack({
            creatorPage,
        }),
    ]);

    await waitForVideoToBePausedForUserWithControl(creatorPage);
});
