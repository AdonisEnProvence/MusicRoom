import { MpeChangeTrackOrderOperationToApply } from '@musicroom/types';
import { test, expect, Page, Locator } from '@playwright/test';
import { promise } from 'zod';
import { KnownSearchesElement, KnownSearchesRecord } from '../_utils/mock-http';
import { closeAllContexts, setupAndGetUserPage } from '../_utils/page';

const knownSearches: KnownSearchesRecord = {
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
};

async function createMpeRoom({
    page,
    openCreatedRoom,
    deviceToOpenRoomOn,
}: {
    page: Page;
    openCreatedRoom?: boolean;
    deviceToOpenRoomOn: Page[];
}) {
    await expect(page.locator('text="Home"').first()).toBeVisible();

    const createMpeRoomButton = page.locator('text="Create MPE room"');
    await expect(createMpeRoomButton).toBeVisible();

    await createMpeRoomButton.click();

    if (openCreatedRoom) {
        await Promise.all(
            [page, ...deviceToOpenRoomOn].map(async (page) => {
                const goToLibraryButton = page.locator('text="Library"');
                await goToLibraryButton.click();

                const libraryScreenTitle = page.locator(
                    'text="Library" >> nth=1',
                );
                await expect(libraryScreenTitle).toBeVisible();

                const mpeRoomCard = page.locator(
                    'css=[data-testid^="mpe-room-card"]',
                );
                await mpeRoomCard.click();
            }),
        );
    }
}

async function addTrack({
    page,
    deviceToApplyAssertionOn,
}: {
    page: Page;
    deviceToApplyAssertionOn: Page[];
}): Promise<KnownSearchesElement> {
    const addTrackButton = page.locator('text="Add Track"');
    await expect(addTrackButton).toBeVisible();

    await addTrackButton.click();

    const searchQuery = 'Biolay - Vendredi 12';

    const searchTrackInput = page.locator(
        'css=[placeholder*="Search a track"] >> visible=true',
    );
    await searchTrackInput.fill(searchQuery);
    await page.keyboard.press('Enter');

    const trackToAdd = page.locator(
        `text=${knownSearches[searchQuery][0].title}`,
    );
    await trackToAdd.click();

    const addedTracks = await Promise.all(
        [page, ...deviceToApplyAssertionOn].map(async (page) => {
            const addedTrackCard = page.locator(
                'css=[data-testid$="track-card-container"] >> nth=1',
            );
            const addedTrack = knownSearches[searchQuery][0];
            await expect(addedTrackCard).toBeVisible();
            await expect(addedTrackCard).toContainText(addedTrack.title);
            return addedTrack;
        }),
    );

    return addedTracks[0];
}

function getTrackChangeOrderButton({
    page,
    trackIDToMove,
    operationToApply,
}: {
    page: Page;
    trackIDToMove: string;
    operationToApply: MpeChangeTrackOrderOperationToApply;
}): Locator {
    return page.locator(
        `css=[data-testid="${trackIDToMove}-track-card-container"] [aria-label="Move ${
            operationToApply === MpeChangeTrackOrderOperationToApply.Values.DOWN
                ? 'down'
                : 'up'
        }"]`,
    );
}

function getTrackDeleteButton({
    page,
    trackID,
}: {
    page: Page;
    trackID: string;
}): Locator {
    return page.locator(
        `css=[data-testid="${trackID}-track-card-container"] [aria-label="Delete"]`,
    );
}

function getAllTracksListCardElements({ page }: { page: Page }): Locator {
    return page.locator(`css=[data-testid$="track-card-container"]`);
}

async function changeTrackOrder({
    page,
    trackIDToMove,
    operationToApply,
    trackTitle,
    deviceToApplyAssertionOn,
}: {
    page: Page;
    trackIDToMove: string;
    trackTitle: string;
    operationToApply: MpeChangeTrackOrderOperationToApply;
    deviceToApplyAssertionOn: Page[];
}): Promise<void> {
    const trackToMoveChangeOrderButton = getTrackChangeOrderButton({
        page,
        trackIDToMove,
        operationToApply,
    });
    await expect(trackToMoveChangeOrderButton).toBeVisible();
    await expect(trackToMoveChangeOrderButton).toBeEnabled();

    await trackToMoveChangeOrderButton.click();

    {
        const successfulToast = page.locator('text=Track moved successfully');
        await expect(successfulToast).toBeVisible();

        await Promise.all(
            [page, ...deviceToApplyAssertionOn].map(async (page) => {
                const firstTracksListElement = page.locator(
                    'css=[data-testid$="track-card-container"] >> nth=0',
                );
                await expect(firstTracksListElement).toContainText(trackTitle);
            }),
        );
    }
}

async function deleteTrack({
    page,
    trackID,
    deviceToApplyAssertionOn,
}: {
    trackID: string;
    page: Page;
    deviceToApplyAssertionOn: Page[];
}): Promise<void> {
    const trackDeleteButton = getTrackDeleteButton({
        page,
        trackID,
    });
    await expect(trackDeleteButton).toBeVisible();
    await expect(trackDeleteButton).toBeEnabled();

    await trackDeleteButton.click();

    {
        const successfulToast = page.locator('text=Track deleted successfully');
        await expect(successfulToast).toBeVisible();

        await Promise.all(
            [page, ...deviceToApplyAssertionOn].map(async (page) => {
                const deleteButton = getTrackDeleteButton({
                    page,
                    trackID,
                });
                await expect(deleteButton).not.toBeVisible();

                const allTracks = getAllTracksListCardElements({
                    page,
                });
                await expect(allTracks).toHaveCount(1);
            }),
        );
    }
}

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

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
    const { page } = await setupAndGetUserPage({
        browser,
        knownSearches,
        userIndex: 0,
    });

    const { page: pageB } = await setupAndGetUserPage({
        browser,
        knownSearches,
        userIndex: 0,
    });

    await createMpeRoom({
        page,
        openCreatedRoom: true,
        deviceToOpenRoomOn: [pageB],
    });

    const addedTrack = await addTrack({
        page,
        deviceToApplyAssertionOn: [pageB],
    });

    await changeTrackOrder({
        page,
        operationToApply: MpeChangeTrackOrderOperationToApply.Values.UP,
        trackIDToMove: addedTrack.id,
        trackTitle: addedTrack.title,
        deviceToApplyAssertionOn: [pageB],
    });

    await deleteTrack({
        page,
        trackID: addedTrack.id,
        deviceToApplyAssertionOn: [pageB],
    });
});
