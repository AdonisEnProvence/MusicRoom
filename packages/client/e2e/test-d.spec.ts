import { test, expect, Page, Locator } from '@playwright/test';
import {
    assertIsNotNull,
    assertIsNotUndefined,
    assertMusicPlayerStatusIs,
} from './_utils/assert';
import { hitGoNextButton } from './_utils/global';
import { KnownSearchesRecord } from './_utils/mock-http';
import {
    closeAllContexts,
    createNewTabFromExistingContext,
    setupAndGetUserPage,
} from './_utils/page';
import { waitForYouTubeVideoToLoad } from './_utils/wait-youtube';

async function createPublicRoomWithInvitation({
    page,
    roomName,
}: {
    page: Page;
    roomName: string;
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

    await firstMatchingSong.click();

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
    const invitationModeSwitch = page.locator('css=[role="switch"]');
    await invitationModeSwitch.click();
    await hitGoNextButton({
        page,
    });

    const noVotingRestriction = page.locator(
        'css=[aria-selected="true"] >> text="No restriction"',
    );
    await expect(noVotingRestriction).toBeVisible();
    await hitGoNextButton({
        page,
    });

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
    const elementWithSelectedSongTitle = page
        .locator(`text=${selectedSongTitle}`)
        .last();
    await expect(elementWithSelectedSongTitle).toBeVisible();
    await hitGoNextButton({
        page,
    });

    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    const miniPlayerWithSelectedSong = page
        .locator(`text=${selectedSongTitle}`)
        .first();
    await expect(miniPlayerWithSelectedSong).toBeVisible();

    await miniPlayerWithRoomName.click();

    return {
        roomName,
        initialTrack: selectedSongTitle,
    };
}

async function waitForJoiningRoom({
    page,
    roomName,
    toggleFullscreen,
}: {
    page: Page;
    roomName: string;
    toggleFullscreen?: boolean;
}) {
    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();

    if (toggleFullscreen !== false) {
        await miniPlayerWithRoomName.click();
    }
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

    // Open player full screen
    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();

    await miniPlayerWithRoomName.click();
}

async function playTrack(page: Page) {
    const fullScreenPlayerPlayButton = page
        .locator('css=[aria-label="Play the video"]')
        .nth(1);
    await expect(fullScreenPlayerPlayButton).toBeVisible();

    await fullScreenPlayerPlayButton.click();
}

async function minimizeMusicPlayer({ page }: { page: Page }) {
    const hideFullscreenButton = page.locator(
        'css=[aria-label="Minimize the music player"]',
    );
    await expect(hideFullscreenButton).toBeVisible();
    await expect(hideFullscreenButton).toBeEnabled();
    await hideFullscreenButton.click();
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

    const deviceToMakeEmitter = page
        .locator(`text=Web Player`)
        .nth(emittingDeviceIndex);
    await expect(deviceToMakeEmitter).toBeVisible();
    await deviceToMakeEmitter.click();
}

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

test('Test D see following link for more informations https://3.basecamp.com/4704981/buckets/22220886/messages/4292491228#:~:text=Test%20end-,Test%20D/,-UserA_Device1%20Section%20full', async ({
    browser,
}) => {
    const knownSearches: KnownSearchesRecord = {
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

    const [
        { context: userAContext, page: userADevice1Page },
        { page: userBPage },
    ] = await Promise.all([
        setupAndGetUserPage({ browser, userIndex: 1, knownSearches }),
        setupAndGetUserPage({ browser, userIndex: 0, knownSearches }),
    ]);

    const roomName = 'MusicRoom is the best';

    await createPublicRoomWithInvitation({ page: userADevice1Page, roomName });

    //Creating tabs
    const { page: userADevice2Page } = await createNewTabFromExistingContext(
        userAContext,
    );
    await waitForJoiningRoom({ page: userADevice2Page, roomName });

    const { page: userADevice3Page } = await createNewTabFromExistingContext(
        userAContext,
    );
    await waitForJoiningRoom({ page: userADevice3Page, roomName });
    ///

    await joinRoom({ page: userBPage, roomName });

    await Promise.all([
        waitForYouTubeVideoToLoad(userADevice1Page),
        waitForYouTubeVideoToLoad(userADevice2Page),
        waitForYouTubeVideoToLoad(userADevice3Page),
        waitForYouTubeVideoToLoad(userBPage),
        playTrack(userADevice2Page),
    ]);

    await Promise.all([
        assertMusicPlayerStatusIs({
            page: userADevice1Page,
            testID: 'music-player-playing-device-emitting',
        }),
        assertMusicPlayerStatusIs({
            page: userADevice2Page,
            testID: 'music-player-playing-device-muted',
        }),
        assertMusicPlayerStatusIs({
            page: userADevice3Page,
            testID: 'music-player-playing-device-muted',
        }),
        assertMusicPlayerStatusIs({
            page: userBPage,
            testID: 'music-player-playing-device-emitting',
        }),
    ]);

    await Promise.all([
        changeEmittingDevice({
            page: userADevice1Page,
            emittingDeviceIndex: 1,
        }),
        assertMusicPlayerStatusIs({
            page: userADevice1Page,
            testID: 'music-player-playing-device-muted',
        }),
    ]);
    await assertMusicPlayerStatusIs({
        page: userADevice2Page,
        testID: 'music-player-playing-device-emitting',
    });
    await assertMusicPlayerStatusIs({
        page: userADevice3Page,
        testID: 'music-player-playing-device-muted',
    });
    await assertMusicPlayerStatusIs({
        page: userBPage,
        testID: 'music-player-playing-device-emitting',
    });

    await Promise.all([
        assertMusicPlayerStatusIs({
            page: userBPage,
            testID: 'music-player-playing-device-emitting',
        }),
        assertMusicPlayerStatusIs({
            page: userADevice3Page,
            testID: 'music-player-playing-device-muted',
        }),
        assertMusicPlayerStatusIs({
            page: userADevice1Page,
            testID: 'music-player-playing-device-emitting',
        }),
        userADevice2Page.close(),
    ]);

    //UserA creates a new room
    const newRoomName = 'second room';
    await minimizeMusicPlayer({
        page: userADevice3Page,
    });
    await minimizeMusicPlayer({
        page: userADevice1Page,
    });

    await Promise.all([
        createPublicRoomWithInvitation({
            page: userADevice3Page,
            roomName: newRoomName,
        }),
        //I don't want to toggle the fullscreen as a bottomsheet modal will
        //block any click event
        waitForJoiningRoom({
            page: userADevice1Page,
            roomName: newRoomName,
            toggleFullscreen: false,
        }),
        expect(userBPage.locator('text="FORCED_DISCONNECTION"')).toBeVisible(),
        assertMusicPlayerStatusIs({
            page: userADevice3Page,
            testID: 'music-player-not-playing-device-emitting',
        }),
        assertMusicPlayerStatusIs({
            page: userADevice1Page,
            testID: 'music-player-not-playing-device-muted',
        }),
    ]);
});
