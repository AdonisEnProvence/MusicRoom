import { Page, test, expect } from '@playwright/test';
import { random } from 'faker';
import { addHours, format } from 'date-fns';
import {
    createMpeRoom,
    goToLibraryAndSearchMpeRoomAndOpenIt,
    knownSearches,
    openMpeSettingsModal,
    withinMusicPlayerFullscreenContainer,
} from '../_utils/mpe-e2e-utils';
import { hitGoNextButton } from '../_utils/global';
import {
    closeAllContexts,
    createNewTabFromExistingContext,
    GEOLOCATION_POSITIONS,
    setupPageAndSignUpUser,
} from '../_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

/**
 * We configure a MTV room with default options.
 */
async function exportMpeRoomToMtvRoomWithConstraint({
    page,
    mtvRoomName,
    address,
    endsAt,
    startsAt,
}: {
    page: Page;
    mtvRoomName: string;
    address: keyof typeof GEOLOCATION_POSITIONS;
    startsAt: Date;
    endsAt: Date;
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

    await expect(
        page.locator(
            'text="Do you want to restrict voting right to physical constraints?"',
        ),
    ).toBeVisible();
    const votingRestriction = page.locator('text="Restrict"');
    await expect(votingRestriction).toBeVisible();
    await votingRestriction.click();

    const placeInput = page.locator('css=[placeholder="Place"]');
    await expect(placeInput).toBeVisible();
    await placeInput.fill(address);

    const placeResultListItem = page.locator(`text="${address}"`);
    await expect(placeResultListItem).toBeVisible();
    await placeResultListItem.click();

    const radiusSelect = page.locator('css=select[data-testid="web_picker"]');
    await expect(radiusSelect).toBeVisible();
    await radiusSelect.selectOption({ label: '1 km' });

    const startsAtDatetimeInput = page.locator(
        'css=[type="datetime-local"] >> nth=0',
    );
    await expect(startsAtDatetimeInput).toBeVisible();
    await startsAtDatetimeInput.fill(format(startsAt, "yyyy-MM-dd'T'HH:mm"));

    const endsAtDatetimeInput = page.locator(
        'css=[type="datetime-local"] >> nth=1',
    );
    await expect(endsAtDatetimeInput).toBeVisible();
    await endsAtDatetimeInput.fill(format(endsAt, "yyyy-MM-dd'T'HH:mm"));

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

    await exportMpeRoomToMtvRoomWithConstraint({
        page,
        mtvRoomName: random.words(),
        address: 'Manosque, France',
        startsAt: new Date(),
        endsAt: addHours(new Date(), 6),
    });

    await expect(
        page.locator('css=[data-testid="open-mtv-room-constraints-details"]'),
    ).toBeVisible();
    await expect(
        pageB.locator('css=[data-testid="open-mtv-room-constraints-details"]'),
    ).toBeVisible();
});
