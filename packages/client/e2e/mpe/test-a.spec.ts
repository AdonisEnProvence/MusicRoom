import { test } from '@playwright/test';
import {
    addTrack,
    changeTrackOrder,
    createMpeRoom,
    deleteTrack,
    goToLibraryAndSearchMpeRoomAndOpenIt,
    waitForTrackToBeAddedOnRoomScreen,
    knownSearches,
} from '../_utils/mpe-e2e-utils';
import { closeAllContexts, setupAndGetUserPage } from '../_utils/page';

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

    await goToLibraryAndSearchMpeRoomAndOpenIt({
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
