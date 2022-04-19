import { test, expect, Page, Locator } from '@playwright/test';
import {
    assertIsNotNull,
    assertIsNotUndefined,
    assertMusicPlayerStatusIs,
} from '../_utils/assert';
import { hitGoNextButton } from '../_utils/global';
import {
    getAppHomeButtonLocator,
    getAppSearchButtonLocator,
    knownSearches,
} from '../_utils/mpe-e2e-utils';
import {
    closeAllContexts,
    createNewTabFromExistingContext,
    setupPageAndSignUpUser,
} from '../_utils/page';
import { waitForYouTubeVideoToLoad } from '../_utils/wait-youtube';

async function createPublicRoomWithInvitation({
    page,
    roomName,
}: {
    page: Page;
    roomName: string;
}) {
    await expect(page.locator(getAppHomeButtonLocator())).toBeVisible();

    const goToTracksSearch = page.locator(getAppSearchButtonLocator());
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

    const createMtvRoomModalButton = page.locator('text="Create MTV"');
    await createMtvRoomModalButton.click();

    await expect(
        page.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    await page.fill('css=[placeholder="Room name"]', roomName);
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

    const expectedListenersCounterAriaLabel = `2 Listeners`;
    await expect(
        page.locator(
            `text="${expectedListenersCounterAriaLabel}" >> visible=true`,
        ),
    ).toBeVisible();
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
    const [
        { context: userAContext, page: userADevice1Page },
        { page: userBPage },
    ] = await Promise.all([
        setupPageAndSignUpUser({ browser, knownSearches }),
        setupPageAndSignUpUser({ browser, knownSearches }),
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
        expect(
            userBPage.locator(
                `text="Creator leaved his Music Track Vote room"`,
            ),
        ).toBeVisible(),
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
