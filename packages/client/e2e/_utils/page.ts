import { Browser, Page, BrowserContext } from '@playwright/test';
import { KnownSearchesRecord, mockSearchTracks } from './mock-http';

export const AVAILABLE_USERS_LIST = [
    {
        uuid: '8d71dcb3-9638-4b7a-89ad-838e2310686c',
        nickname: 'Francis',
    },
    {
        uuid: '71bc3025-b765-4f84-928d-b4dca8871370',
        nickname: 'Moris',
    },
    {
        uuid: 'd125ecde-b0ee-4ab8-a488-c0e7a8dac7c5',
        nickname: 'Leila',
    },
    {
        uuid: '7f4bc598-c5be-4412-acc4-515a87b797e7',
        nickname: 'Manon',
    },
];

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
    userIndex: number;
    knownSearches: KnownSearchesRecord;
    town?: keyof typeof GEOLOCATION_POSITIONS;
};
export async function setupAndGetUserPage({
    browser,
    userIndex,
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
                            value: AVAILABLE_USERS_LIST[userIndex].uuid,
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
    await page.goto('/');

    const focusTrap = page.locator('text="Click"').first();
    await focusTrap.click();

    return {
        context,
        page,
        userNickname: AVAILABLE_USERS_LIST[userIndex].nickname,
        userID: AVAILABLE_USERS_LIST[userIndex].uuid,
    };
}

export async function initPage(page: Page): Promise<void> {
    await page.goto('/');

    const focusTrap = page.locator('text="Click"').first();
    await focusTrap.click();
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

export async function closeAllContexts(browser: Browser): Promise<void> {
    const contexts = browser.contexts();
    await Promise.all(contexts.map(async (context) => await context.close()));
}
