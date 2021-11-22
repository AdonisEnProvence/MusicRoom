import { test, expect, Page, Locator } from '@playwright/test';
import { addHours, format } from 'date-fns';
import {
    assertIsNotNull,
    assertIsNotUndefined,
    assertMusicPlayerStatusIs,
} from './_utils/assert';
import {
    closeAllContexts,
    createNewTabFromExistingContext,
    GEOLOCATION_POSITIONS,
    initPage,
    setupAndGetUserPage,
} from './_utils/page';
import { waitForYouTubeVideoToLoad } from './_utils/wait-youtube';

const knownSearches = {
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

    await expect(page.locator('text="Results"')).toBeVisible();

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

    await expect(
        page.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    await page.fill('css=[placeholder="Francis Cabrel OnlyFans"]', roomName);
    await page.click('text="Next" >> visible=true');

    await expect(
        page.locator('text="What is the opening status of the room?"'),
    ).toBeVisible();

    const publicMode = page.locator(
        'css=[aria-selected="true"] >> text="Public"',
    );
    await expect(publicMode).toBeVisible();
    await page.click('text="Next" >> visible=true');

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

    await page.click('text="Next" >> visible=true');
    /**
     * END Physical and time constraints
     */

    const broadcastMode = page.locator(
        'css=[aria-selected="true"] >> text="Broadcast"',
    );
    await expect(broadcastMode).toBeVisible();
    await page.click('text="Next" >> visible=true');

    const twoVotesConstraintButton = page.locator(
        `text="Friendly online event"`,
    );
    await expect(twoVotesConstraintButton).toBeVisible();
    await twoVotesConstraintButton.click();

    await page.click('text="Next" >> visible=true');

    await expect(page.locator('text="Confirm room creation"')).toBeVisible();
    const elementWithSelectedSongTitle = page.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(elementWithSelectedSongTitle).toBeVisible();

    await page.click('text="Next" >> visible=true');

    // We expect creation form to have disappeared
    // and user to have not been redirected to another screen than
    // the one in which she opened the form.
    await expect(page.locator('text="Results"').first()).toBeVisible();

    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    const miniPlayerWithSelectedSong = page.locator(
        `text=${selectedSongTitle} >> nth=0`,
    );
    await expect(miniPlayerWithSelectedSong).toBeVisible();

    await miniPlayerWithRoomName.click();

    return {
        roomName,
        initialTrack: selectedSongTitle,
        initialTrackID: selectedSongID,
    };
}

async function joinRoom({ page, roomName }: { page: Page; roomName: string }) {
    await page.click('text="Go to Music Track Vote"');

    // Code to use infinite scroll
    let matchingRoom: Locator | undefined;
    let hasFoundRoom = false;

    await page.mouse.move((page.viewportSize()?.width ?? 0) / 2, 150);
    while (hasFoundRoom === false) {
        await page.mouse.wheel(0, 999999);

        matchingRoom = page.locator(`text="${roomName}"`).first();
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
    await page.click('css=[aria-label="Go back"] >> visible=true');

    return await openFullScreenPlayer({
        page,
        roomName,
    });
}

/**
 * /!\ The page has to be in music player fullscreen before calling this function /!\
 */
async function userSuggestsATrackFromFullscreen({
    page,
    trackName,
}: {
    page: Page;
    trackName: keyof typeof knownSearches;
}) {
    const suggestTrackButton = page.locator(
        'css=[aria-label="Suggest a track"] >> visible=true',
    );
    await expect(suggestTrackButton).toBeVisible();
    await expect(suggestTrackButton).toBeEnabled();
    await suggestTrackButton.click();

    await page.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackName,
    );
    await page.keyboard.press('Enter');

    await expect(
        page.locator('text="Results" >> visible=true').first(),
    ).toBeVisible();

    const firstMatchingSong = page.locator(`text=${trackName}`).first();
    await expect(firstMatchingSong).toBeVisible();
    const selectedSongTitle = await firstMatchingSong.textContent();
    assertIsNotNull(selectedSongTitle, 'selectedSongTitle is null');
    const selectedTrackEntry = knownSearches[trackName].find(
        ({ title }) => title === selectedSongTitle,
    );
    assertIsNotUndefined(
        selectedTrackEntry,
        'The selected song does not exist in knownSearches',
    );
    const selectedSongID = selectedTrackEntry.id;

    await firstMatchingSong.click();
    return {
        selectedSongTitle,
        selectedSongID,
    };
}

async function voteForEnabledTrackInMusicPlayerFullScreen({
    page,
    trackToVoteForID,
}: {
    page: Page;
    trackToVoteForID: string;
}) {
    const trackToVoteForElement = page
        .locator(`css=[data-testid="${trackToVoteForID}-track-card"]`)
        .last();
    await expect(trackToVoteForElement).not.toHaveAttribute(
        'aria-disabled',
        'true',
        {
            timeout: 10_000,
        },
    );

    await trackToVoteForElement.click();
}

async function voteForTrackInMusicPlayerFullScreen({
    page,
    trackToVoteFor,
}: {
    page: Page;
    trackToVoteFor: string;
}) {
    const trackToVoteForElement = page.locator(`text=${trackToVoteFor}`).last();
    await expect(trackToVoteForElement).toBeVisible({
        timeout: 30_000,
    });

    await trackToVoteForElement.click();
}

async function openFullScreenPlayer({
    page,
    roomName,
}: {
    page: Page;
    roomName: string;
}) {
    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();

    await miniPlayerWithRoomName.click();
}

async function waitForTrackCardToHaveScore({
    page,
    score,
    trackID,
}: {
    page: Page;
    score: string;
    trackID: string;
}) {
    const suggestedTrackScore = page.locator(
        `css=:text("${score}"):right-of([data-testid="${trackID}-track-card"])`,
    );
    await expect(suggestedTrackScore).toBeVisible({
        timeout: 10_000,
    });
}

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

test('Test F', async ({ browser }) => {
    const [
        { page: userADevice1Page },
        { context: userBContext, page: userBDevice1Page },
    ] = await Promise.all([
        setupAndGetUserPage({
            browser,
            userIndex: 0,
            knownSearches,
            town: 'Manosque, France',
        }),
        setupAndGetUserPage({
            browser,
            userIndex: 1,
            knownSearches,
            town: 'Paris, France',
        }),
    ]);

    await userBDevice1Page.waitForTimeout(1_000);
    const { page: userBDevice2Page } = await createNewTabFromExistingContext(
        userBContext,
    );

    const roomName = 'MusicRoom is the best';

    const { initialTrack, initialTrackID } =
        await createPublicRoomWithTimeAndPhysicalConstraints({
            page: userADevice1Page,
            roomName,
            address: 'Manosque, France',
            // startsAt: addMinutes(new Date(), 1),
            startsAt: new Date(),
            endsAt: addHours(new Date(), 6),
        });

    await joinRoom({ page: userBDevice1Page, roomName });

    await openFullScreenPlayer({
        page: userBDevice2Page,
        roomName,
    });

    // User B votes for the initial track.
    // It should have no impact.
    // If it has one, the rest of the test will break.
    await voteForTrackInMusicPlayerFullScreen({
        page: userBDevice1Page,
        trackToVoteFor: initialTrack,
    });

    // We wait for the room to allow votes according to time constraints.
    // await userBDevice1Page.waitForTimeout(60_000);

    // User B votes again for the initial track.
    // It should fail as the user does not yet match
    // physical constraints.
    await voteForTrackInMusicPlayerFullScreen({
        page: userBDevice1Page,
        trackToVoteFor: initialTrack,
    });

    // User B enters in room area.
    await userBContext.setGeolocation(
        GEOLOCATION_POSITIONS['Manosque, France'],
    );
    await userBDevice1Page.reload();
    await initPage(userBDevice1Page);
    await openFullScreenPlayer({
        page: userBDevice1Page,
        roomName,
    });

    await voteForTrackInMusicPlayerFullScreen({
        page: userBDevice1Page,
        trackToVoteFor: initialTrack,
    });

    await Promise.all([
        voteForEnabledTrackInMusicPlayerFullScreen({
            page: userADevice1Page,
            trackToVoteForID: initialTrackID,
        }),

        waitForYouTubeVideoToLoad(userADevice1Page),
        waitForYouTubeVideoToLoad(userBDevice1Page),
        waitForYouTubeVideoToLoad(userBDevice2Page),
    ]);

    await Promise.all([
        assertMusicPlayerStatusIs({
            page: userADevice1Page,
            testID: 'music-player-playing-device-emitting',
        }),

        // The device 2 has become the emitting device as device 1 exited.
        assertMusicPlayerStatusIs({
            page: userBDevice2Page,
            testID: 'music-player-playing-device-emitting',
        }),
    ]);

    // User B exits room area.
    await userBContext.setGeolocation(
        GEOLOCATION_POSITIONS['Soissons, France'],
    );
    await userBDevice1Page.reload();
    await initPage(userBDevice1Page);
    await openFullScreenPlayer({
        page: userBDevice1Page,
        roomName,
    });
    // Close second user B's device so that the user is really outside of room area.
    await userBDevice2Page.close();

    // User B suggests a song while being outside of room area.
    const suggestedTrackQuery = 'Biolay - Vendredi 12';
    const {
        selectedSongTitle: suggestedTrackTitle,
        selectedSongID: suggestedTrackID,
    } = await userSuggestsATrackFromFullscreen({
        page: userBDevice1Page,
        trackName: suggestedTrackQuery,
    });

    // User A votes for the track
    await voteForTrackInMusicPlayerFullScreen({
        page: userADevice1Page,
        trackToVoteFor: suggestedTrackTitle,
    });

    await voteForTrackInMusicPlayerFullScreen({
        page: userBDevice1Page,
        trackToVoteFor: suggestedTrackTitle,
    });

    await Promise.all([
        waitForTrackCardToHaveScore({
            page: userADevice1Page,
            score: '1/2',
            trackID: suggestedTrackID,
        }),
        waitForTrackCardToHaveScore({
            page: userBDevice1Page,
            score: '1/2',
            trackID: suggestedTrackID,
        }),
    ]);
});
