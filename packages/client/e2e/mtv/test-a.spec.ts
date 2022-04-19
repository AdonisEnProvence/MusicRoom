import { test, expect, Page, Locator } from '@playwright/test';
import {
    assertIsNotNull,
    assertIsNotUndefined,
    assertMusicPlayerStatusIs,
} from '../_utils/assert';
import { hitGoNextButton } from '../_utils/global';
import { knownSearches } from '../_utils/mpe-e2e-utils';
import { closeAllContexts, setupPageAndSignUpUser } from '../_utils/page';
import { waitForYouTubeVideoToLoad } from '../_utils/wait-youtube';

async function createRoom({ creatorPage }: { creatorPage: Page }) {
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
    await creatorPage.fill('css=[placeholder="Room name"]', roomName);

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
    const elementWithSelectedSongTitle = creatorPage.locator(
        `text=${selectedSongTitle}`,
    );
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

async function joinerJoinsRoom({
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

async function joinerSuggestsTrack({
    joinerPage,
    query,
    trackToSelect,
}: {
    joinerPage: Page;
    query: string;
    //After a long test the specific searched track to select could be
    //Displayed a lot, picking the last nth on first matching element
    //wouldnot be accurate anymore
    trackToSelect?: string;
}) {
    const suggestTrackButton = joinerPage.locator(
        'css=[aria-label="Suggest a track"]',
    );
    await expect(suggestTrackButton).toBeVisible();

    await suggestTrackButton.click();

    await expect(
        joinerPage.locator('text="Suggest Track" >> visible=true'),
    ).toBeVisible();

    const searchTrackInput = joinerPage
        .locator('css=[placeholder*="Search a track"]')
        .last();
    await expect(searchTrackInput).toBeVisible();

    // const searchedTrackName = ;
    const searchedTrackName = query;
    await searchTrackInput.fill(searchedTrackName);
    await joinerPage.keyboard.press('Enter');

    const firstMatchingSong = joinerPage
        .locator(`text=${trackToSelect ?? searchedTrackName} >> visible=true`)
        .last();
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

    const suggestTrackInTracksList = joinerPage
        .locator(`text=${selectedSongTitle} >> visible=true`)
        .last();
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

async function waitForVideoToBePausedForUserWithControl(page: Page) {
    const fullScreenPlayerPauseButton = page.locator(
        'css=[aria-label="Pause the video"]:not(:disabled) >> nth=1',
    );

    await expect(fullScreenPlayerPauseButton).toBeVisible();
}

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

test('Test A', async ({ browser }) => {
    const [{ page: creatorPage }, { page: joinerPage }] = await Promise.all([
        setupPageAndSignUpUser({ browser, knownSearches }),
        setupPageAndSignUpUser({ browser, knownSearches }),
    ]);

    const { roomName, initialTrack } = await createRoom({ creatorPage });

    await joinerJoinsRoom({ joinerPage, roomName });

    const { joinerSuggestedTrack } = await joinerSuggestsTrack({
        joinerPage,
        query: 'Biolay - Vendredi 12',
    });

    await Promise.all([
        waitForYouTubeVideoToLoad(creatorPage),
        waitForYouTubeVideoToLoad(joinerPage),

        creatorVotesForTrack({
            creatorPage,
            trackToVoteFor: joinerSuggestedTrack,
        }),
    ]);

    await creatorPausesTrack({ creatorPage, joinerPage });

    await joinerSuggestsTrack({
        joinerPage,
        query: 'BB Brunes',
        trackToSelect: knownSearches['BB Brunes'][0].title,
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
