import { test, expect, Browser, Page, Locator } from '@playwright/test';
import { KnownSearchesRecord, mockSearchTracks } from './utils';

function assertIsNotUndefined<ValueType>(
    value: ValueType | undefined,
): asserts value is ValueType {
    if (value === undefined) {
        throw new Error('value must not be undefined');
    }
}

const AVAILABLE_USERS_LIST = [
    '8d71dcb3-9638-4b7a-89ad-838e2310686c',
    '71bc3025-b765-4f84-928d-b4dca8871370',
    'd125ecde-b0ee-4ab8-a488-c0e7a8dac7c5',
    '7f4bc598-c5be-4412-acc4-515a87b797e7',
];

type SetupAndGetUserContextArgs = {
    browser: Browser;
    userIndex: number;
    knownSearches: KnownSearchesRecord;
};
async function setupAndGetUserContext({
    browser,
    userIndex,
    knownSearches,
}: SetupAndGetUserContextArgs): Promise<{ page: Page }> {
    const joinerContext = await browser.newContext({
        storageState: {
            cookies: [],
            origins: [
                {
                    origin: 'http://localhost:4000',
                    localStorage: [
                        {
                            name: 'USER_ID',
                            value: AVAILABLE_USERS_LIST[userIndex],
                        },
                    ],
                },
            ],
        },
    });
    const page = await joinerContext.newPage();

    await mockSearchTracks({
        context: joinerContext,
        knownSearches,
    });
    await page.goto('/');

    return { page };
}

type FindMiniPlayerWithRoomNameAndGoFullscreenArgs = {
    roomName: string;
    page: Page;
};
async function findMiniPlayerWithRoomNameAndGoFullscreen({
    page,
    roomName,
}: FindMiniPlayerWithRoomNameAndGoFullscreenArgs) {
    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    await miniPlayerWithRoomName.click();
}

type CreateRoomArgs = { creatorPage: Page; trackName: string };
async function createDirectRoomAndGoFullscreen({
    creatorPage,
    trackName,
}: CreateRoomArgs) {
    const focusTrap = creatorPage.locator('text="Click"').first();
    await focusTrap.click();

    await expect(creatorPage.locator('text="Home"').first()).toBeVisible();

    //Searching for a track
    const goToTracksSearch = creatorPage.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = trackName;
    await creatorPage.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackQuery,
    );
    await creatorPage.keyboard.press('Enter');

    await expect(
        creatorPage.locator('text="Results" >> visible=true').first(),
    ).toBeVisible();

    //I have no idea why but text selector below have to be written without \"\"
    const firstMatchingSong = creatorPage.locator(`text=${trackName}`).first();
    const selectedSongTitle = await firstMatchingSong.textContent();
    if (selectedSongTitle === null) {
        throw new Error('SelectedSongTitle is null');
    }
    await expect(firstMatchingSong).toBeVisible();

    await firstMatchingSong.click();

    /** Entering the mtv room creation form **/
    //RoomName
    await expect(
        creatorPage.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    const roomName = 'MusicRoom is the best';
    await creatorPage.fill(
        'css=[placeholder="Francis Cabrel OnlyFans"]',
        roomName,
    );
    await creatorPage.click('text="Next" >> visible=true');

    //Room isOpen
    await expect(
        creatorPage.locator('text="What is the opening status of the room?"'),
    ).toBeVisible();

    const publicMode = creatorPage.locator(
        'css=[aria-selected="true"] >> text="Public"',
    );
    await expect(publicMode).toBeVisible();
    await creatorPage.click('text="Next" >> visible=true');

    //Voting restrictions
    const noVotingRestriction = creatorPage.locator(
        'css=[aria-selected="true"] >> text="No restriction"',
    );
    await expect(noVotingRestriction).toBeVisible();
    await creatorPage.click('text="Next" >> visible=true');

    //Room mode
    const directMode = creatorPage.locator(
        'css=[aria-selected="false"] >> text="Direct"',
    );
    await expect(directMode).toBeVisible();
    await directMode.click();
    await creatorPage.click('text="Next" >> visible=true');

    //Minimum count to be played
    const smallestVotesConstraint = creatorPage.locator(
        `css=[aria-selected="false"] >> text="Friendly online event"`,
    );
    await expect(smallestVotesConstraint).toBeVisible();
    await smallestVotesConstraint.click();
    await creatorPage.click('text="Next" >> visible=true');

    //Confirmation
    await expect(
        creatorPage.locator('text="Confirm room creation"'),
    ).toBeVisible();
    const elementWithSelectedSongTitle = creatorPage.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(elementWithSelectedSongTitle).toBeVisible();

    await creatorPage.click('text="Next" >> visible=true');
    ///

    // We expect creation form to have disappeared
    // and user to have not been redirected to another screen than
    // the one in which she opened the form.
    await expect(creatorPage.locator('text="Results"').first()).toBeVisible();

    await findMiniPlayerWithRoomNameAndGoFullscreen({
        page: creatorPage,
        roomName,
    });

    return {
        roomName,
        selectedSongTitle,
    };
}

type JoinGivenRoomAndGoFullscreenArgs = {
    joiningUserPage: Page;
    roomName: string;
    expectedListenersCounterValue: number;
};
async function userJoinsGivenRoomAndGoFullscreen({
    joiningUserPage,
    roomName,
    expectedListenersCounterValue,
}: JoinGivenRoomAndGoFullscreenArgs) {
    const focusTrap = joiningUserPage.locator('text="Click"').first();
    await focusTrap.click();

    await joiningUserPage.click('text="Go to Music Track Vote"');

    // Code to use infinite scroll
    let matchingRoom: Locator | undefined;
    let hasFoundRoom = false;

    await joiningUserPage.mouse.move(
        (joiningUserPage.viewportSize()?.width ?? 0) / 2,
        150,
    );
    while (hasFoundRoom === false) {
        await joiningUserPage.mouse.wheel(0, 999999);

        matchingRoom = joiningUserPage.locator(`text="${roomName}"`).first();
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

    await joiningUserPage.click('css=[aria-label="Go back"] >> visible=true');

    await findMiniPlayerWithRoomNameAndGoFullscreen({
        page: joiningUserPage,
        roomName,
    });

    const expectedListenersCounterAriaLabel = `${expectedListenersCounterValue} Listeners`;
    await expect(
        joiningUserPage.locator(
            `text="${expectedListenersCounterAriaLabel}" >> visible=true`,
        ),
    ).toBeVisible();
}

type UserVoteForGivenTrackArgs = {
    page: Page;
    trackName: string;
};
/**
 * /!\ The page has to be in music player fullscreen before calling this function /!\
 */
async function userVoteForGivenTrackFromFullscreen({
    page,
    trackName,
}: UserVoteForGivenTrackArgs) {
    const trackItem = page.locator(`text="${trackName}" >> visible=true`);
    await expect(trackItem).toBeVisible();
    await expect(trackItem).toBeEnabled();
    await trackItem.click();

    //Not working as expected below
    // await expect(
    //     page.locator(`text="${trackName}" >> visible=true`),
    // ).toBeDisabled();
}

/**
 * /!\ The page has to be in music player fullscreen before calling this function /!\
 */
async function userSuggestATrackFromFullscreen({
    page,
    trackName,
}: UserVoteForGivenTrackArgs) {
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

    await expect(page.locator('text="Results" >> visible=true')).toBeVisible();

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

type UserTogglePlayPauseButtonFromFullscreenPlayerArgs = {
    page: Page;
};
async function userHitPlayFromFullscreenPlayer({
    page,
}: UserTogglePlayPauseButtonFromFullscreenPlayerArgs) {
    const fullScreenPlayerPlayButton = page.locator(
        'css=[aria-label="Play the video"]:not(:disabled) >> nth=1',
    );
    await expect(fullScreenPlayerPlayButton).toBeVisible();

    await fullScreenPlayerPlayButton.click();

    const fullScreenPlayerPauseButton = page.locator(
        'css=[aria-label="Pause the video"] >> nth=1',
    );
    await expect(fullScreenPlayerPauseButton).toBeVisible();
    await expect(fullScreenPlayerPauseButton).toBeEnabled();
}

async function userHitPauseFromFullscreenPlayer({
    page,
}: UserTogglePlayPauseButtonFromFullscreenPlayerArgs) {
    const fullScreenPlayerPauseButton = page.locator(
        'css=[aria-label="Pause the video"]:not(:disabled) >> nth=1',
    );
    await expect(fullScreenPlayerPauseButton).toBeVisible();

    await fullScreenPlayerPauseButton.click();

    const fullScreenPlayerPlayButton = page.locator(
        'css=[aria-label="Play the video"] >> nth=1',
    );
    await expect(fullScreenPlayerPlayButton).toBeVisible();
    await expect(fullScreenPlayerPlayButton).toBeEnabled();
}
type UserGoesToTheUsersListFromFullscreenPlayerArgs = {
    page: Page;
    usersLength: number;
};
async function userGoesToTheUsersListFromFullscreenPlayer({
    page,
    usersLength,
}: UserGoesToTheUsersListFromFullscreenPlayerArgs) {
    const listenersCounter = page.locator(`text="${usersLength} Listeners"`);
    await expect(listenersCounter).toBeVisible();
    await expect(listenersCounter).toBeEnabled();

    await listenersCounter.click();

    await expect(page.locator('text="Users list"')).toBeVisible();
}

type GoToUserSettingsArgs = {
    page: Page;
    userNickname: string;
};
async function openUserSettings({ page, userNickname }: GoToUserSettingsArgs) {
    const userCard = page.locator(
        `css=[data-testid="${userNickname}-user-card"]`,
    );
    await expect(userCard).toBeVisible();
    const userCardThreeDotsButton = page.locator(
        `css=[aria-label="Open user ${userNickname} settings"] >> visible=true`,
    );
    await expect(userCardThreeDotsButton).toBeVisible();
    await expect(userCardThreeDotsButton).toBeEnabled();

    await userCardThreeDotsButton.click();

    const userBottomSheetModalSettings = page.locator(
        `text="${userNickname} settings"`,
    );
    await expect(userBottomSheetModalSettings).toBeVisible();

    // threeDotsAccessibilityLabel={`Open user ${item.nickname} settings`}
    // testID={`${props.user.nickname}-user-card`}
    // 'css=[data-testid="music-player-not-playing-device-emitting"]',
}

test('Test B see following link for more information: https://3.basecamp.com/4704981/buckets/22220886/messages/4292491228#:~:text=Test%20end-,Test%20B/,-UserA%20Section%20full', async ({
    browser,
}) => {
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

    let userIndex = 0;
    const [
        { page: creatorUserA },
        { page: joiningUserB },
        { page: joiningUserC },
    ] = await Promise.all([
        setupAndGetUserContext({
            browser,
            userIndex: userIndex++,
            knownSearches,
        }),
        setupAndGetUserContext({
            browser,
            userIndex: userIndex++,
            knownSearches,
        }),
        setupAndGetUserContext({
            browser,
            userIndex: userIndex++,
            knownSearches,
        }),
    ]);

    const { roomName, selectedSongTitle } =
        await createDirectRoomAndGoFullscreen({
            creatorPage: creatorUserA,
            trackName: 'BB Brunes',
        });

    await userJoinsGivenRoomAndGoFullscreen({
        joiningUserPage: joiningUserB,
        roomName,
        expectedListenersCounterValue: 2,
    });
    await userJoinsGivenRoomAndGoFullscreen({
        joiningUserPage: joiningUserC,
        roomName,
        expectedListenersCounterValue: 3,
    });

    const suggestedTrackName = 'Biolay - Vendredi 12';
    const { selectedSongTitle: suggestedSongTitle } =
        await userSuggestATrackFromFullscreen({
            page: creatorUserA,
            trackName: suggestedTrackName,
        });
    await expect(
        joiningUserB.locator(`text="${suggestedSongTitle}" >> visible=true`),
    ).toBeVisible();
    await expect(
        joiningUserC.locator(`text="${suggestedSongTitle}" >> visible=true`),
    ).toBeVisible();

    await userVoteForGivenTrackFromFullscreen({
        page: joiningUserB,
        trackName: selectedSongTitle,
    });

    //pause
    await userHitPauseFromFullscreenPlayer({
        page: creatorUserA,
    });
    const joinerMusicPlayerNotPlaying = creatorUserA.locator(
        'css=[data-testid="music-player-not-playing-device-emitting"]',
    );
    await expect(joinerMusicPlayerNotPlaying).toBeVisible();

    //go to users list
    await userGoesToTheUsersListFromFullscreenPlayer({
        page: creatorUserA,
        usersLength: 3,
    });

    //open userB settings
    await openUserSettings({
        page: creatorUserA,
        userNickname: 'available-user-B',
    });

    await creatorUserA.waitForTimeout(100_000);
});
