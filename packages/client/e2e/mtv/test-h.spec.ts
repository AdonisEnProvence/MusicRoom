import { test, expect, Page } from '@playwright/test';
import {
    addHours,
    addMinutes,
    addSeconds,
    differenceInMilliseconds,
    format,
} from 'date-fns';
import {
    assertIsNotNull,
    assertIsNotUndefined,
    assertMusicPlayerStatusIs,
} from '../_utils/assert';
import { hitGoNextButton } from '../_utils/global';
import { knownSearches } from '../_utils/mpe-e2e-utils';
import {
    closeAllContexts,
    GEOLOCATION_POSITIONS,
    setupAndGetUserPage,
} from '../_utils/page';
import { waitForYouTubeVideoToLoad } from '../_utils/wait-youtube';

async function createPublicRoomWithTimeAndPhysicalConstraints({
    page,
    roomName,
    address,
    startsAt,
    endsAt,
}: {
    page: Page;
    roomName: string;
    address: keyof typeof GEOLOCATION_POSITIONS;
    startsAt: Date;
    endsAt: Date;
}) {
    await expect(page.locator('text="Home"').first()).toBeVisible();

    const goToTracksSearch = page.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = 'BB Brunes';
    await page.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackQuery,
    );
    await page.keyboard.press('Enter');

    const firstMatchingSong = page.locator('text=BB Brunes').first();
    await expect(firstMatchingSong).toBeVisible();

    const selectedSongTitle = await firstMatchingSong.textContent();
    assertIsNotNull(
        selectedSongTitle,
        'The selected song must exist and have a text content',
    );
    const selectedTrackEntry = knownSearches[trackQuery].find(
        ({ title }) => title === selectedSongTitle,
    );
    assertIsNotUndefined(
        selectedTrackEntry,
        'The selected song does not exist in knownSearches',
    );
    const selectedSongID = selectedTrackEntry.id;

    await firstMatchingSong.click();

    const createMtvRoomModalButton = page.locator('text="Create MTV"');
    await createMtvRoomModalButton.click();

    await expect(
        page.locator('text="What is the name of the room?"'),
    ).toBeVisible();

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

    /**
     * Physical and time constraints
     */
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
    await hitGoNextButton({
        page,
    });

    /**
     * END Physical and time constraints
     */

    const broadcastMode = page.locator(
        'css=[aria-selected="true"] >> text="Broadcast"',
    );
    await expect(broadcastMode).toBeVisible();
    await hitGoNextButton({
        page,
    });

    const oneVoteConstraintButton = page.locator(
        `css=[aria-selected="true"] >> text="Party at Kitty and Stud's"`,
    );
    await expect(oneVoteConstraintButton).toBeVisible();
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

    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    const miniPlayerWithSelectedSong = page.locator(
        `text=${selectedSongTitle} >> nth=0`,
    );
    await expect(miniPlayerWithSelectedSong).toBeVisible();

    return {
        roomName,
        initialTrack: selectedSongTitle,
        initialTrackID: selectedSongID,
    };
}

async function voteForEnabledTrackInMusicPlayerFullScreen({
    page,
    trackToVoteForID,
    timeout,
}: {
    page: Page;
    trackToVoteForID: string;
    timeout: number;
}) {
    const trackToVoteForElement = page
        .locator(`css=[data-testid="${trackToVoteForID}-track-card"]`)
        .last();
    await expect(trackToVoteForElement).not.toHaveAttribute(
        'aria-disabled',
        'true',
        {
            timeout,
        },
    );

    await trackToVoteForElement.click();
}

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

test('Test H', async ({ browser }) => {
    const { page: userADevice1Page } = await setupAndGetUserPage({
        browser,
        knownSearches,
        town: 'Manosque, France',
    });

    const roomCreatedAt = new Date();
    const startsAt = addMinutes(roomCreatedAt, 1);
    const endsAt = addHours(roomCreatedAt, 6);
    const mustHaveStartedAt = addSeconds(startsAt, 5);

    const { initialTrackID } =
        await createPublicRoomWithTimeAndPhysicalConstraints({
            page: userADevice1Page,
            roomName: 'MusicRoom is the best',
            address: 'Manosque, France',
            startsAt,
            endsAt,
        });

    // Ensure initial track card is disabled
    await expect(
        userADevice1Page
            .locator(`css=[data-testid="${initialTrackID}-track-card"]`)
            .last(),
    ).toHaveAttribute('aria-disabled', 'true');

    await voteForEnabledTrackInMusicPlayerFullScreen({
        page: userADevice1Page,
        trackToVoteForID: initialTrackID,
        timeout: differenceInMilliseconds(mustHaveStartedAt, roomCreatedAt),
    });

    await Promise.all([
        waitForYouTubeVideoToLoad(userADevice1Page),
        assertMusicPlayerStatusIs({
            page: userADevice1Page,
            testID: 'music-player-playing-device-emitting',
        }),
    ]);
});
