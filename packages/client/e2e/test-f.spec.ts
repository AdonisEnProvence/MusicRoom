import {
    test,
    expect,
    Browser,
    BrowserContext,
    Page,
    Locator,
} from '@playwright/test';
import { addHours, addMinutes, addSeconds, format } from 'date-fns';
import { assertIsNotNull, assertIsNotUndefined } from './_utils/assert';
import { KnownSearchesRecord, mockSearchTracks } from './_utils/mock-http';
import { waitForYouTubeVideoToLoad } from './_utils/wait-youtube';

const AVAILABLE_USERS_LIST = [
    {
        uuid: '8d71dcb3-9638-4b7a-89ad-838e2310686c',
        nickname: 'Francis',
    },
    {
        uuid: '71bc3025-b765-4f84-928d-b4dca8871370',
        nickname: 'Moris',
    },
    {
        uuid: 'd125ecde-b0ee-4ab8-a488-c0e7a8dac7c5',
        nickname: 'Leila',
    },
    {
        uuid: '7f4bc598-c5be-4412-acc4-515a87b797e7',
        nickname: 'Manon',
    },
];

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

const GEOLOCATION_POSITIONS = {
    'Paris, France': {
        latitude: 48.864716,
        longitude: 2.349014,
    },

    'Soissons, France': {
        latitude: 49.38167,
        longitude: 3.32361,
    },

    'Manosque, France': {
        latitude: 43.82883,
        longitude: 5.78688,
    },
};

async function createContext({
    browser,
    index,
    town,
}: {
    browser: Browser;
    index: number;
    town: keyof typeof GEOLOCATION_POSITIONS;
}) {
    const user = AVAILABLE_USERS_LIST[index];
    const context = await browser.newContext({
        storageState: {
            cookies: [],
            origins: [
                {
                    origin: 'http://localhost:4000',
                    localStorage: [
                        {
                            name: 'USER_ID',
                            value: user.uuid,
                        },
                    ],
                },
            ],
        },
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS[town],
    });
    await mockSearchTracks({
        context,
        knownSearches,
    });

    return {
        context,
        userName: user.nickname,
    };
}

async function setupPageFromContext(context: BrowserContext) {
    const page = await context.newPage();

    await setUpPage(page);

    return {
        page,
    };
}

async function setUpPage(page: Page) {
    await page.goto('/');

    const focusTrap = page.locator('text="Click"').first();
    await focusTrap.click();
}

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

async function waitForJoiningRoom({
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

async function waitForPlayerState({
    page,
    testID,
}: {
    page: Page;
    testID: `music-player-${'playing' | 'not-playing'}-device-${
        | 'emitting'
        | 'muted'}`;
}) {
    const player = page.locator(
        `css=[data-testid="${testID}"] >> visible=true`,
    );
    await expect(player).toBeVisible();
}

async function playTrack(page: Page) {
    const fullScreenPlayerPlayButton = page.locator(
        'css=[aria-label="Play the video"] >> nth=1',
    );
    await expect(fullScreenPlayerPlayButton).toBeVisible();

    await fullScreenPlayerPlayButton.click();
}

async function changeEmittingDevice({
    page,
    emittingDeviceIndex,
}: {
    page: Page;
    emittingDeviceIndex: number;
}) {
    const settingsTab = page.locator('text="Settings" >> visible=true');
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();

    const changeEmittingDeviceButton = page.locator(
        'text="Change emitting device" >> visible=true',
    );
    await expect(changeEmittingDeviceButton).toBeVisible();
    await changeEmittingDeviceButton.click();

    const deviceToMakeEmitter = page.locator(
        `text=Web Player >> nth=${emittingDeviceIndex}`,
    );
    await expect(deviceToMakeEmitter).toBeVisible();
    await deviceToMakeEmitter.click();
}

/**
 * /!\ The page has to be in music player fullscreen before calling this function /!\
 */
async function userSuggestsATrackFromFullscreen({
    page,
    trackName,
}: {
    page: Page;
    trackName: string;
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
    if (selectedSongTitle === null) {
        throw new Error('SelectedSongTitle is null');
    }
    await expect(firstMatchingSong).toBeVisible();

    await firstMatchingSong.click();
    return { selectedSongTitle };
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
    await expect(trackToVoteForElement).toBeVisible();

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

test('Test F', async ({ browser }) => {
    const [{ context: userAContext }, { context: userBContext }] =
        await Promise.all([
            createContext({ browser, index: 0, town: 'Manosque, France' }),
            createContext({ browser, index: 1, town: 'Paris, France' }),
        ]);
    const [{ page: userADevice1Page }, { page: userBDevice1Page }] =
        await Promise.all([
            setupPageFromContext(userAContext),

            setupPageFromContext(userBContext),
        ]);

    await userBDevice1Page.waitForTimeout(1_000);
    const { page: userBDevice2Page } = await setupPageFromContext(userBContext);

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
    await setUpPage(userBDevice1Page);
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
    ]);

    await Promise.all([
        waitForPlayerState({
            page: userADevice1Page,
            testID: 'music-player-playing-device-emitting',
        }),
        waitForPlayerState({
            page: userBDevice1Page,
            testID: 'music-player-playing-device-emitting',
        }),
    ]);

    // User B exits room area.
    await userBContext.setGeolocation(
        GEOLOCATION_POSITIONS['Soissons, France'],
    );
    await userBDevice1Page.reload();
    await setUpPage(userBDevice1Page);
    await openFullScreenPlayer({
        page: userBDevice1Page,
        roomName,
    });
    // Close second user B's device so that the user is really outside of room area.
    await userBDevice2Page.close();

    // User B suggests a song while being outside of room area.
    const suggestedTrackQuery = 'Biolay - Vendredi 12';
    const { selectedSongTitle: suggestTrackTitle } =
        await userSuggestsATrackFromFullscreen({
            page: userBDevice1Page,
            trackName: suggestedTrackQuery,
        });

    // User A votes for the track
    await voteForTrackInMusicPlayerFullScreen({
        page: userADevice1Page,
        trackToVoteFor: suggestTrackTitle,
    });

    await voteForTrackInMusicPlayerFullScreen({
        page: userBDevice1Page,
        trackToVoteFor: suggestTrackTitle,
    });

    await expect(
        userBDevice1Page.locator(`text=${suggestTrackTitle} 1/2`),
    ).toBeVisible();

    await userADevice1Page.waitForTimeout(100_000);
});
