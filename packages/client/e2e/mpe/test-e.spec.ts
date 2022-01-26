import { test, expect, Page } from '@playwright/test';
import { assertIsNotNull, assertMusicPlayerStatusIs } from '../_utils/assert';
import { hitGoNextButton } from '../_utils/global';
import {
    addTrack,
    createMpeRoom,
    goToHomeTabScreen,
    knownSearches,
    openMpeSettingsModal,
    withinMusicPlayerFullscreenContainer,
} from '../_utils/mpe-e2e-utils';
import { closeAllContexts, setupAndGetUserPage } from '../_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

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
        `text="Party at Kitty and Stud's"`,
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

async function hitMtvPlayButton({ page }: { page: Page }): Promise<void> {
    const fullScreenPlayerPauseButton = page
        .locator('css=[aria-label="Play the video"]')
        .last();
    await expect(fullScreenPlayerPauseButton).toBeVisible();
    await expect(fullScreenPlayerPauseButton).not.toHaveAttribute(
        'aria-disabled',
        'true',
    );

    await fullScreenPlayerPauseButton.click();
}

async function exportMpeRoomToMtvRoom({
    page,
    mtvRoomName,
}: {
    page: Page;
    mtvRoomName: string;
}): Promise<void> {
    await openMpeSettingsModal({
        page,
    });

    const exportToMtvButton = page.locator('text="Export to MTV"');
    await exportToMtvButton.click();

    await expect(
        page.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    await page.fill('css=[placeholder="Francis Cabrel OnlyFans"]', mtvRoomName);

    // Go to opening status screen.
    await hitGoNextButton({ page });

    // Go to physical constraints screen.
    await hitGoNextButton({ page });

    // Go to playing mode screen.
    await hitGoNextButton({ page });

    // Go to vote constraints screen.
    await hitGoNextButton({ page });

    // Go to confirmation screen.
    await hitGoNextButton({ page });

    // Confirm export.
    await hitGoNextButton({ page });

    const roomNameInFullScreenPlayer = page.locator(
        withinMusicPlayerFullscreenContainer(`text="${mtvRoomName}"`),
    );
    await expect(roomNameInFullScreenPlayer).toBeVisible();
}

// Test-E USerA MTV and MPE Transversal
// UserA creates an MTV room, default settings.
// UserA hit play control button in the MTV room
// UserA creates an MPE room, default settings.
// UserA adds a song to the created MPE room
// UserA exports the created MPE as MTV, default settings, created MTV should still be playing, all mpe tracks should have been exported
// UserA should see exported MTV room music player fullscreen
test('mpe e2e test-e', async ({ browser }) => {
    const { page } = await setupAndGetUserPage({
        browser,
        knownSearches,
        userIndex: 0,
    });

    await createRoom({
        creatorPage: page,
    });

    await hitMtvPlayButton({
        page,
    });

    await assertMusicPlayerStatusIs({
        page,
        testID: 'music-player-playing-device-emitting',
    });

    const minimizeMusicPlayerButton = page.locator(
        `css=[aria-label="Minimize the music player"]`,
    );
    await expect(minimizeMusicPlayerButton).toBeVisible();
    await minimizeMusicPlayerButton.click();

    await goToHomeTabScreen({
        page,
    });

    await createMpeRoom({
        page,
    });

    await assertMusicPlayerStatusIs({
        page,
        testID: 'music-player-playing-device-emitting',
    });

    const addedTrack = await addTrack({
        page,
        searchQuery: 'BB Brunes',
    });

    await assertMusicPlayerStatusIs({
        page,
        testID: 'music-player-playing-device-emitting',
    });

    await exportMpeRoomToMtvRoom({
        mtvRoomName: 'cocorico',
        page,
    });

    const addedTrackTestID = `mtv-${addedTrack.id}-track-card-container`;
    const addedTrackMtvCard = page.locator(
        withinMusicPlayerFullscreenContainer(
            `css=[data-testid$="${addedTrackTestID}"]`,
        ),
    );
    await expect(addedTrackMtvCard).toBeVisible();
});
