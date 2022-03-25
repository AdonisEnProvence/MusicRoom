import { test, expect } from '@playwright/test';
import { mockSearchTracks } from './_utils/mock-http';
import {
    knownSearches,
    pageIsOnEmailConfirmationScreen,
    pageIsOnHomeScreen,
    pageIsOnSignInScreen,
    withinSignInFormScreenContainer,
} from './_utils/mpe-e2e-utils';
import {
    closeAllContexts,
    GEOLOCATION_POSITIONS,
    setupPageAndSignUpUser,
} from './_utils/page';

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

test('It should renders sign in screen on every browser tab and other devices after a signOut from email verification screen', async ({
    browser,
}) => {
    const { page, context, password, email } = await setupPageAndSignUpUser({
        browser,
        doNotByPassEmailVerification: true,
        knownSearches,
    });
    const secondContext = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
    });

    const secondContextPage = await secondContext.newPage();
    await secondContextPage.goto('/');

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

    const firstContextEveryTabs = [page, newTab, newTab1, newTab2];

    await Promise.all(
        firstContextEveryTabs.map(
            async (page) => await pageIsOnEmailConfirmationScreen({ page }),
        ),
    );

    //Sign in second context page
    const emailInput = secondContextPage.locator(
        withinSignInFormScreenContainer(`css=[placeholder="Email"]`),
    );
    await expect(emailInput).toBeVisible();
    await emailInput.fill(email);

    const passwordInput = secondContextPage.locator(
        withinSignInFormScreenContainer(`css=[placeholder="Password"]`),
    );
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(password);

    const submitSignInFormButton = secondContextPage.locator(
        withinSignInFormScreenContainer(`text="Log in"`),
    );
    await expect(submitSignInFormButton).toBeVisible();
    await submitSignInFormButton.click();

    await pageIsOnEmailConfirmationScreen({ page: secondContextPage });
    ///

    const pageSignOutButton = page.locator(
        `css=[data-testid="email-confirmation-sign-out-button"]`,
    );
    await expect(pageSignOutButton).toBeVisible();
    await pageSignOutButton.click();

    await Promise.all(
        firstContextEveryTabs.map(
            async (page) => await pageIsOnSignInScreen({ page }),
        ),
    );
    await pageIsOnEmailConfirmationScreen({ page: secondContextPage });
});
