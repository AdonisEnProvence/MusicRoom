import { Browser, Page, BrowserContext, expect } from '@playwright/test';
import * as z from 'zod';
import invariant from 'tiny-invariant';
import { KnownSearchesRecord, mockSearchTracks } from './mock-http';

const UserCredentials = z.object({
    userID: z.string().uuid(),
    userNickname: z.string(),
});

type UserCredentials = z.infer<typeof UserCredentials>;

export const GEOLOCATION_POSITIONS = {
    'Paris, France': {
        latitude: 48.864716,
        longitude: 2.349014,
    },

    'Soissons, France': {
        latitude: 49.38167,
        longitude: 3.32361,
    },

    'Manosque, France': {
        latitude: 43.82883,
        longitude: 5.78688,
    },
};

type SetupAndGetUserContextArgs = {
    browser: Browser;
    knownSearches: KnownSearchesRecord;
    town?: keyof typeof GEOLOCATION_POSITIONS;
};
export async function setupAndGetUserPage({
    browser,
    knownSearches,
    town,
}: SetupAndGetUserContextArgs): Promise<{
    context: BrowserContext;
    page: Page;
    userNickname: string;
    userID: string;
}> {
    const context = await browser.newContext({
        storageState: {
            cookies: [],
            origins: [
                {
                    origin: 'http://localhost:4000',
                    localStorage: [
                        {
                            name: 'USER_ID',
                            value: '8d71dcb3-9638-4b7a-89ad-838e2310686c',
                        },
                    ],
                },
            ],
        },
        permissions: ['geolocation'],
        geolocation:
            town === undefined ? undefined : GEOLOCATION_POSITIONS[town],
    });
    const page = await context.newPage();

    await mockSearchTracks({
        context: context,
        knownSearches,
    });

    await initPage(page);

    await PerformSignUp(page);

    await initPage(page);

    const storageState = await context.storageState();

    const userCredentialsLocalStorage = storageState.origins
        .slice(-1)[0]
        .localStorage.find((el) => el.name === 'USER_CREDENTIALS');

    invariant(
        userCredentialsLocalStorage !== undefined,
        'could not retrieve user credentials from local storage',
    );
    const { userID, userNickname } = UserCredentials.parse(
        JSON.parse(userCredentialsLocalStorage.value),
    );

    return {
        context,
        page,
        userNickname,
        userID,
    };
}

export async function initPage(page: Page): Promise<void> {
    await page.goto('/');

    const focusTrap = page.locator('text="Click"').first();
    await focusTrap.click();
}

export async function PerformSignUp(page: Page): Promise<void> {
    const signUpButton = page
        .locator(`css=[data-testid="sign-up-button"]`)
        .last();
    await expect(signUpButton).toBeVisible();

    await signUpButton.click();

    await expect(
        page.locator(`text="Signed up successfully"`).last(),
    ).toBeVisible();

    await page.reload();
}

/**
 * Use this function to create tab
 */
export async function createNewTabFromExistingContext(
    context: BrowserContext,
): Promise<{ page: Page }> {
    const page = await context.newPage();

    await initPage(page);

    return {
        page,
    };
}

/** */

export async function closeAllContexts(browser: Browser): Promise<void> {
    const contexts = browser.contexts();
    await Promise.all(contexts.map(async (context) => await context.close()));
}
