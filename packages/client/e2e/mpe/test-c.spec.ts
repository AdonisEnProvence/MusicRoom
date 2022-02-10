import { test } from '@playwright/test';
import {
    createMpeRoom,
    knownSearches,
    searchAndJoinMpeRoomFromMpeRoomsSearchEngine,
    checkUsersLength,
    leaveMpeRoom,
    goToHomeTabScreen,
    pageIsOnHomeScreen,
} from '../_utils/mpe-e2e-utils';
import { closeAllContexts, setupPageAndSignUpUser } from '../_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

// UserA creates a mpe room and goes to created mpe room view
// UserB joins the UserA created mpe room,
// UserB should see the joined room view with enabled cta,
// UserA should receives a usersLength update
// UserC joins the UserA created mpe room, but go to the home view
// UserA ( creator ) leaves the mpe room, he should see the success toast and should be redirected to the library search view,
// UserB should receive a FORCED_DISCONNECTION event. He should see a related forced disconnection toast and should be redirected on the library view
// UserC should receive a FORCED_DISCONNECTION event. He should see a related forced disconnection toast and should not be redirect anywhere as he's viewing the home ( at least an other screen then the disconnected from mpe room view )
test('Basic user leaves mpe room', async ({ browser }) => {
    const { page: creatorUserA } = await setupPageAndSignUpUser({
        browser,
        knownSearches,
    });

    const { page: joiningUserB } = await setupPageAndSignUpUser({
        browser,
        knownSearches,
    });

    const { page: joiningUserC } = await setupPageAndSignUpUser({
        browser,
        knownSearches,
    });

    const { roomName } = await createMpeRoom({
        page: creatorUserA,
    });

    await searchAndJoinMpeRoomFromMpeRoomsSearchEngine({
        page: joiningUserB,
        roomName,
    });

    await checkUsersLength({
        expectedUsersLength: 2,
        page: creatorUserA,
    });

    await searchAndJoinMpeRoomFromMpeRoomsSearchEngine({
        page: joiningUserC,
        roomName,
    });

    await goToHomeTabScreen({
        page: joiningUserC,
    });

    await checkUsersLength({
        expectedUsersLength: 3,
        page: creatorUserA,
    });

    await leaveMpeRoom({
        leavingPage: creatorUserA,
        roomName,
        forcedDisconnectedNotRedirectedOtherUsersPages: [
            {
                page: joiningUserC,
                assertion: async () => {
                    await pageIsOnHomeScreen({
                        page: joiningUserC,
                    });
                },
            },
        ],
        forcedDisconnectedRedirectedOtherUsersPages: [joiningUserB],
    });
});
