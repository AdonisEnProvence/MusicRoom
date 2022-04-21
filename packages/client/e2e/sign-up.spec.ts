import { test, expect } from '@playwright/test';
import { internet } from 'faker';
import { mockSearchTracks } from './_utils/mock-http';
import {
    knownSearches,
    pageIsOnHomeScreen,
    pageIsOnSignInScreen,
    withinSignUpFormScreenContainer,
} from './_utils/mpe-e2e-utils';
import {
    bypassVerifyEmailScreen,
    closeAllContexts,
    GEOLOCATION_POSITIONS,
} from './_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

test('Signs up a user, expects to be redirected to home and to be still loggged in on another page or after a refresh', async ({
    browser,
}) => {
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

    await pageIsOnSignInScreen({ page });

    await page.click('text="Or sign up ?"');

    await expect(page.locator('text="To party sign up !"')).toBeVisible();

    const userName = internet.userName();
    await page.fill(
        withinSignUpFormScreenContainer('[placeholder="Nickname"]'),
        userName,
    );
    const email = internet.email();
    await page.fill(
        withinSignUpFormScreenContainer('[placeholder="Email"]'),
        email,
    );
    const password = 'adfg=1435&*&*(SjhgA';
    await page.fill(
        withinSignUpFormScreenContainer('[placeholder="Password"]'),
        password,
    );

    await page.click('text="Sign Up"');

    await bypassVerifyEmailScreen({
        page,
    });

    await pageIsOnHomeScreen({ page, timeout: 20000 });

    await page.reload();

    await pageIsOnHomeScreen({ page, timeout: 20000 });

    const newTab = await context.newPage();
    await newTab.goto('/');

    await pageIsOnHomeScreen({ page: newTab, timeout: 20000 });
});

test('It should renders home on every browser tab after a signUp', async ({
    browser,
}) => {
    const context = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
    });
    const secondContext = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
    });
    await mockSearchTracks({
        context: context,
        knownSearches,
    });

    const page = await context.newPage();
    await page.goto('/');

    const newTab1 = await context.newPage();
    await newTab1.goto('/');

    const newTab2 = await context.newPage();
    await newTab2.goto('/');

    const secondContextPage = await secondContext.newPage();
    await secondContextPage.goto('/');

    await pageIsOnSignInScreen({ page });

    await page.click('text="Or sign up ?"');

    await expect(page.locator('text="To party sign up !"')).toBeVisible();

    const userName = internet.userName();
    await page.fill(
        withinSignUpFormScreenContainer('[placeholder="Nickname"]'),
        userName,
    );
    const email = internet.email();
    await page.fill(
        withinSignUpFormScreenContainer('[placeholder="Email"]'),
        email,
    );
    const password = 'adfg=1435&*&*(SjhgA';
    await page.fill(
        withinSignUpFormScreenContainer('[placeholder="Password"]'),
        password,
    );

    await page.click('text="Sign Up"');

    await bypassVerifyEmailScreen({
        page,
    });

    await pageIsOnHomeScreen({ page, timeout: 20000 });
    await pageIsOnHomeScreen({ page: newTab1, timeout: 20000 });
    await pageIsOnHomeScreen({ page: newTab2, timeout: 20000 });
    await pageIsOnSignInScreen({ page: secondContextPage });
});
