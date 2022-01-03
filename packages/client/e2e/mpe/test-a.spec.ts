import { MpeChangeTrackOrderOperationToApply } from '@musicroom/types';
import { test, expect, Page, Locator } from '@playwright/test';
import { random } from 'faker';
import { assertIsNotNull } from '../_utils/assert';
import { hitGoNextButton } from '../_utils/global';
import { KnownSearchesElement, KnownSearchesRecord } from '../_utils/mock-http';
import { closeAllContexts, setupAndGetUserPage } from '../_utils/page';

function withinMpeRoomsListScreen(selector: string): string {
    return `css=[data-testid="mpe-rooms-list"] >> ${selector}`;
}

function withinMpeRoomScreen(selector: string): string {
    return `css=[data-testid^="mpe-room-screen-"] >> ${selector}`;
}

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
};

async function createMpeRoom({
    page,
}: {
    page: Page;
}): Promise<{ roomName: string }> {
    await expect(page.locator('text="Home"').first()).toBeVisible();

    const goToTracksSearch = page.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = 'Biolay - Vendredi 12';
    await page.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackQuery,
    );
    await page.keyboard.press('Enter');

    const firstMatchingSong = page
        .locator(`text=${knownSearches[trackQuery][0].title}`)
        .first();
    await expect(firstMatchingSong).toBeVisible();

    const selectedSongTitle = await firstMatchingSong.textContent();
    assertIsNotNull(
        selectedSongTitle,
        'The selected song must exist and have a text content',
    );

    await firstMatchingSong.click();

    const createMpeRoomModalButton = page.locator('text="Create MPE"');
    await createMpeRoomModalButton.click();

    await expect(
        page.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    const roomName = random.words();
    await page.fill('css=[placeholder="Francis Cabrel OnlyFans"]', roomName);

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
    await hitGoNextButton({
        page,
    });

    await expect(page.locator('text="Confirm room creation"')).toBeVisible();
    const elementWithSelectedSongTitle = page.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(elementWithSelectedSongTitle).toBeVisible();
    await hitGoNextButton({
        page,
    });

    await goToLibraryAndSearchMpeRoomToOpenIt({
        page,
        roomName,
    });

    return {
        roomName,
    };
}

async function goToLibraryAndSearchMpeRoomToOpenIt({
    page,
    roomName,
}: {
    page: Page;
    roomName: string;
}) {
    const goToLibraryButton = page.locator('text="Library" >> nth=0');
    await goToLibraryButton.click();

    const libraryScreenTitle = page.locator(
        withinMpeRoomsListScreen('text="Your library"'),
    );
    await expect(libraryScreenTitle).toBeVisible();

    const mpeRoomCard = page.locator(
        withinMpeRoomsListScreen(`text="${roomName}"`),
    );
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const roomHasBeenFound = await mpeRoomCard.isVisible();
        if (roomHasBeenFound === true) {
            break;
        }

        const searchRoomInput = page.locator(
            withinMpeRoomsListScreen('css=[placeholder^="Search a room"]'),
        );
        await searchRoomInput.click();

        const cancelSearchRoomButton = page.locator(
            withinMpeRoomsListScreen('text="Cancel"'),
        );
        await cancelSearchRoomButton.click();
    }

    await mpeRoomCard.click();
}

async function addTrack({
    page,
}: {
    page: Page;
}): Promise<KnownSearchesElement> {
    const addTrackButton = page.locator('text="Add Track"');
    await expect(addTrackButton).toBeVisible();

    await addTrackButton.click();

    const searchQuery = 'BB Brunes';

    const searchTrackInput = page.locator(
        'css=[placeholder*="Search a track"] >> visible=true',
    );
    await searchTrackInput.fill(searchQuery);
    await page.keyboard.press('Enter');

    const trackToAdd = knownSearches[searchQuery][0];
    const trackToAddTitle = trackToAdd.title;
    const trackToAddCard = page.locator(`text=${trackToAddTitle}`);
    await trackToAddCard.click();

    const addedTrackCardOnRoomScreen = page.locator(
        withinMpeRoomScreen(`text=${trackToAddTitle}`),
    );
    await expect(addedTrackCardOnRoomScreen).toBeVisible();

    return trackToAdd;
}

async function waitForTrackToBeAddedOnRoomScreen({
    page,
    addedTrackTitle,
}: {
    page: Page;
    addedTrackTitle: string;
}) {
    await expect(
        page.locator(withinMpeRoomScreen(`text=${addedTrackTitle}`)),
    ).toBeVisible();
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
        withinMpeRoomScreen(
            `css=[data-testid="${trackIDToMove}-track-card-container"] [aria-label="Move ${
                operationToApply === 'DOWN' ? 'down' : 'up'
            }"]`,
        ),
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
        withinMpeRoomScreen(
            `css=[data-testid="${trackID}-track-card-container"] [aria-label="Delete"]`,
        ),
    );
}

function getAllTracksListCardElements({ page }: { page: Page }): Locator {
    return page.locator(
        withinMpeRoomScreen(`css=[data-testid$="track-card-container"]`),
    );
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

    const successfulToast = page.locator('text=Track moved successfully');
    await Promise.all([
        expect(successfulToast).toBeVisible(),

        trackToMoveChangeOrderButton.click(),
    ]);

    await Promise.all(
        [page, ...deviceToApplyAssertionOn].map(async (page) => {
            const firstTracksListElement = page.locator(
                withinMpeRoomScreen(
                    'css=[data-testid$="track-card-container"] >> nth=0',
                ),
            );
            await expect(firstTracksListElement).toContainText(trackTitle);
        }),
    );
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

    const { roomName } = await createMpeRoom({
        page,
    });

    await goToLibraryAndSearchMpeRoomToOpenIt({
        page: pageB,
        roomName,
    });

    const addedTrack = await addTrack({
        page,
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
});
