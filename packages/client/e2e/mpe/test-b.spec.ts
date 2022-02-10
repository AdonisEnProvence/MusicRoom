import { test } from '@playwright/test';
import {
    createMpeRoom,
    knownSearches,
    searchAndJoinMpeRoomFromMpeRoomsSearchEngine,
    checkUsersLength,
    leaveMpeRoom,
    pageIsOnHomeScreen,
    goToHomeTabScreen,
} from '../_utils/mpe-e2e-utils';
import {
    closeAllContexts,
    createNewTabFromExistingContext,
    setupPageAndSignUpUser,
} from '../_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

// Test-b UserA creates UserB joins and leave
//
// UserA creates a mpe room and goes to created mpe room view
// UserB init two devices
// UserB Device1 joins the UserA created mpe room,
// UserB Device1 should see the joined room view with enabled cta,
// UserB Device2 goes from the home to the library search engine and should find the joined mpe room name in the search results
// UserA should receives a usersLength update
// UserB device2 goes to home screen
// UserB Device1 leaves the mpe room,
// UserB Device1 should see the success toast and should be redirected to the library search view
// UserB Device2 should see the leave success toast only
// UserA should receive a usersLengthUpdate
test('Basic user leaves mpe room', async ({ browser }) => {
    const { page: creatorPage } = await setupPageAndSignUpUser({
        browser,
        knownSearches,
    });

    const { page: joiningUserPage1, context: joiningUserContext } =
        await setupPageAndSignUpUser({
            browser,
            knownSearches,
        });

    const { page: joiningUserPage2 } = await createNewTabFromExistingContext(
        joiningUserContext,
    );

    const { roomName } = await createMpeRoom({
        page: creatorPage,
    });

    await searchAndJoinMpeRoomFromMpeRoomsSearchEngine({
        page: joiningUserPage1,
        roomName,
        otherUserDevicesToApplyAssertionOn: [joiningUserPage2],
    });

    await goToHomeTabScreen({
        page: joiningUserPage2,
    });

    await checkUsersLength({
        expectedUsersLength: 2,
        page: creatorPage,
    });

    await leaveMpeRoom({
        leavingPage: joiningUserPage1,
        roomName,
        notRedirectedLeavingUserPages: [
            {
                assertion: async () => {
                    await pageIsOnHomeScreen({
                        page: joiningUserPage2,
                    });
                },
                page: joiningUserPage2,
            },
        ],
    });

    await checkUsersLength({
        expectedUsersLength: 1,
        page: creatorPage,
    });
});
