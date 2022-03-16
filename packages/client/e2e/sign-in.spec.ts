import { test, expect } from '@playwright/test';
import { mockSearchTracks } from './_utils/mock-http';
import {
    knownSearches,
    pageIsOnHomeScreen,
    withinSignInFormScreenContainer,
} from './_utils/mpe-e2e-utils';
import { GEOLOCATION_POSITIONS, setupPageAndSignUpUser } from './_utils/page';

test('Signs up a user, expects to be redirected to home and to be still loggged in on another page or after a refresh', async ({
    browser,
}) => {
    const { email, password } = await setupPageAndSignUpUser({
        browser,

        knownSearches,
    });

    const context = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
    });
    await mockSearchTracks({
        context: context,
        knownSearches,
    });

    const page = await context.newPage();
    await page.goto('/');

    const emailInput = page.locator(
        withinSignInFormScreenContainer(`css=[placeholder="Email"]`),
    );
    await expect(emailInput).toBeVisible();
    await emailInput.fill(email);

    const passwordInput = page.locator(
        withinSignInFormScreenContainer(`css=[placeholder="Password"]`),
    );
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(password);

    const submitSignInFormButton = page.locator(
        withinSignInFormScreenContainer(`text="Log in"`),
    );
    await expect(submitSignInFormButton).toBeVisible();
    await submitSignInFormButton.click();

    await pageIsOnHomeScreen({ page });

    await page.reload();

    await pageIsOnHomeScreen({ page });

    const newTab = await context.newPage();
    await newTab.goto('/');

    await pageIsOnHomeScreen({ page: newTab });
});