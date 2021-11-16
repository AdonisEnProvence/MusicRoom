import { Browser, Page } from '@playwright/test';
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

type SetupAndGetUserContextArgs = {
    browser: Browser;
    userIndex: number;
    knownSearches: KnownSearchesRecord;
};
export async function setupAndGetUserPage({
    browser,
    userIndex,
    knownSearches,
}: SetupAndGetUserContextArgs): Promise<{
    page: Page;
    userNickname: string;
    userID: string;
}> {
    const joinerContext = await browser.newContext({
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
    });
    const page = await joinerContext.newPage();

    await mockSearchTracks({
        context: joinerContext,
        knownSearches,
    });
    await page.goto('/');

    return {
        page,
        userNickname: AVAILABLE_USERS_LIST[userIndex].nickname,
        userID: AVAILABLE_USERS_LIST[userIndex].uuid,
    };
}
