import { test, expect } from '@playwright/test';

test('Room creation', async ({ page }) => {
    await page.goto('/');

    const focusTrap = page.locator('text="Click"').first();
    await focusTrap.click();

    await expect(page.locator('text="Home"').first()).toBeVisible();

    const goToTracksSearch = page.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = 'BB Brunes';
    await page.fill('css=[placeholder*="Search a track"]', trackQuery);
    await page.keyboard.press('Enter');

    await expect(page.locator('text="Results"')).toBeVisible();

    const firstMatchingSong = page.locator('text=BB Brunes').first();
    await expect(firstMatchingSong).toBeVisible();

    await firstMatchingSong.click();

    await expect(
        page.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    const roomName = 'MusicRoom is the best';
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

    const noVotingRestriction = page.locator(
        'css=[aria-selected="true"] >> text="No restriction"',
    );
    await expect(noVotingRestriction).toBeVisible();
    await page.click('text="Next" >> visible=true');

    const broadcastMode = page.locator(
        'css=[aria-selected="true"] >> text="Broadcast"',
    );
    await expect(broadcastMode).toBeVisible();
    await page.click('text="Next" >> visible=true');

    const smallestVotesConstraint = page.locator(
        `css=[aria-selected="true"] >> text="Party at Kitty and Stud's"`,
    );
    await expect(smallestVotesConstraint).toBeVisible();
    await page.click('text="Next" >> visible=true');

    await expect(page.locator('text="Confirm room creation"')).toBeVisible();
    const selectedSongTitle = await firstMatchingSong.textContent();
    await expect(page.locator(`text=${selectedSongTitle}`)).toBeVisible();

    await page.waitForTimeout(100_000);
});
