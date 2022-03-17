import { test, expect } from '@playwright/test';
import { mockSearchTracks } from './_utils/mock-http';
import {
    knownSearches,
    pageIsOnHomeScreen,
    pageIsOnSignInScreen,
} from './_utils/mpe-e2e-utils';
import { closeAllContexts, setupPageAndSignUpUser } from './_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

test('It should sign out user and redirect him to the sign in view', async ({
    browser,
}) => {
    const { page, context } = await setupPageAndSignUpUser({
        browser,

        knownSearches,
    });
    await mockSearchTracks({
        context: context,
        knownSearches,
    });

    await pageIsOnHomeScreen({
        page,
    });
    const goToMyProfileButton = page.locator(
        'css=[data-testid="open-my-profile-page-button"]',
    );
    await expect(goToMyProfileButton).toBeVisible();
    await goToMyProfileButton.click();
    await expect(
        page.locator('css=[data-testid="my-profile-page-container"]'),
    ).toBeVisible();

    const goToMySettingsButton = page.locator(
        'css=[data-testid="go-to-my-settings-button"]',
    );
    await expect(goToMySettingsButton).toBeVisible();
    await goToMySettingsButton.click();
    await expect(
        page.locator('css=[data-testid="my-profile-settings-page-container"]'),
    ).toBeVisible();

    const myProfileSettingsSignOutButton = page.locator(
        'css=[data-testid="my-profile-sign-out-button"]',
    );
    await expect(myProfileSettingsSignOutButton).toBeVisible();

    await myProfileSettingsSignOutButton.click();
    await pageIsOnSignInScreen({ page });

    await page.reload();

    await pageIsOnSignInScreen({ page });

    const newTab = await context.newPage();
    await newTab.goto('/');

    await pageIsOnSignInScreen({ page });
});

test('It should renders sign in screen on every browser tab after a signOut', async ({
    browser,
}) => {
    const { page, context } = await setupPageAndSignUpUser({
        browser,

        knownSearches,
    });

    await mockSearchTracks({
        context: context,
        knownSearches,
    });

    const newTab = await context.newPage();
    await newTab.goto('/');

    const newTab1 = await context.newPage();
    await newTab1.goto('/');

    const newTab2 = await context.newPage();
    await newTab2.goto('/');

    await pageIsOnHomeScreen({
        page,
    });
    const goToMyProfileButton = page.locator(
        'css=[data-testid="open-my-profile-page-button"]',
    );
    await expect(goToMyProfileButton).toBeVisible();
    await goToMyProfileButton.click();
    await expect(
        page.locator('css=[data-testid="my-profile-page-container"]'),
    ).toBeVisible();

    const goToMySettingsButton = page.locator(
        'css=[data-testid="go-to-my-settings-button"]',
    );
    await expect(goToMySettingsButton).toBeVisible();
    await goToMySettingsButton.click();
    await expect(
        page.locator('css=[data-testid="my-profile-settings-page-container"]'),
    ).toBeVisible();

    const myProfileSettingsSignOutButton = page.locator(
        'css=[data-testid="my-profile-sign-out-button"]',
    );
    await expect(myProfileSettingsSignOutButton).toBeVisible();

    await myProfileSettingsSignOutButton.click();

    await pageIsOnSignInScreen({ page });
    await pageIsOnSignInScreen({ page: newTab });
    await pageIsOnSignInScreen({ page: newTab1 });
    await pageIsOnSignInScreen({ page: newTab2 });
});
