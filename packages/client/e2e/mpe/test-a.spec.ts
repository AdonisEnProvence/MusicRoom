import { Page, test, expect } from '@playwright/test';
import { random } from 'faker';
import {
    addTrack,
    changeTrackOrder,
    createMpeRoom,
    deleteTrack,
    goToLibraryAndSearchMpeRoomAndOpenIt,
    waitForTrackToBeAddedOnRoomScreen,
    knownSearches,
    openMpeSettingsModal,
    withinMusicPlayerFullscreenContainer,
} from '../_utils/mpe-e2e-utils';
import { hitGoNextButton } from '../_utils/global';
import {
    closeAllContexts,
    createNewTabFromExistingContext,
    setupPageAndSignUpUser,
} from '../_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

/**
 * We configure a MTV room with default options.
 */
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

    await page.fill('css=[placeholder="Room name"]', mtvRoomName);

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

/**
 * Temp test-a description:
 *
 * -UserA creates an basic mpe room
 * -UserA should see the joined room on both his devices
 * -UserA adds a track to the playlist
 * -UserA should see the added track on both his devices
 * -UserA change the track order of the added track to the top
 * -UserA should see the moved track as the first tracks list element on both his devices
 * -UserA deletes the added track from the tracks playlist
 * -UserA shouldn't be able to see the deleted track on both his devices
 */
test('Create MPE room', async ({ browser }) => {
    const { page, context } = await setupPageAndSignUpUser({
        browser,
        knownSearches,
    });

    const { page: pageB } = await createNewTabFromExistingContext(context);

    const { roomName } = await createMpeRoom({
        page,
    });

    await goToLibraryAndSearchMpeRoomAndOpenIt({
        page: pageB,
        roomName,
    });

    const addedTrack = await addTrack({
        page,
        searchQuery: 'BB Brunes',
    });

    await waitForTrackToBeAddedOnRoomScreen({
        page: pageB,
        addedTrackTitle: addedTrack.title,
    });

    await changeTrackOrder({
        page,
        operationToApply: 'UP',
        trackIDToMove: addedTrack.id,
        trackTitle: addedTrack.title,
        deviceToApplyAssertionOn: [pageB],
    });

    await deleteTrack({
        page,
        trackID: addedTrack.id,
        deviceToApplyAssertionOn: [pageB],
    });

    await exportMpeRoomToMtvRoom({
        page,
        mtvRoomName: random.words(),
    });
});
