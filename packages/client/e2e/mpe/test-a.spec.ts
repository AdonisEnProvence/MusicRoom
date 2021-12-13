import { test, expect, Page } from '@playwright/test';
import { KnownSearchesRecord } from '../_utils/mock-http';
import { setupAndGetUserPage } from '../_utils/page';

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

async function createMpeRoom({ page }: { page: Page }) {
    await expect(page.locator('text="Home"').first()).toBeVisible();

    const createMpeRoomButton = page.locator('text="Create MPE room"');
    await expect(createMpeRoomButton).toBeVisible();

    await createMpeRoomButton.click();
}

test('Create MPE room', async ({ browser }) => {
    const { page } = await setupAndGetUserPage({
        browser,
        knownSearches,
        userIndex: 0,
    });

    await createMpeRoom({ page });

    const goToLibraryButton = page.locator('text="Library"');
    await goToLibraryButton.click();

    const libraryScreenTitle = page.locator('text="Library" >> nth=1');
    await expect(libraryScreenTitle).toBeVisible();

    const mpeRoomCard = page.locator('css=[data-testid^="mpe-room-card"]');
    await mpeRoomCard.click();

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

    const addedTrackCard = page.locator(
        'css=[data-testid$="track-card-container"] >> nth=1',
    );
    await expect(addedTrackCard).toBeVisible();
    await expect(addedTrackCard).toContainText(
        knownSearches[searchQuery][0].title,
    );
});
