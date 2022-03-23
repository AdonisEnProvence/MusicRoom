import { Browser, Page, BrowserContext, expect } from '@playwright/test';
import { internet, unique } from 'faker';
import { SignUpSuccessfullResponseBody } from '@musicroom/types';
import { KnownSearchesRecord, mockSearchTracks } from './mock-http';
import {
    pageIsOnEmailConfirmationScreen,
    pageIsOnHomeScreen,
    withinSignUpFormScreenContainer,
} from './mpe-e2e-utils';

const SERVER_ENDPOINT = 'http://localhost:3333';

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
export async function setupPageAndSignUpUser({
    browser,
    knownSearches,
    town,
}: SetupAndGetUserContextArgs): Promise<{
    context: BrowserContext;
    page: Page;
    userNickname: string;
    password: string;
    email: string;
    userID: string;
}> {
    const context = await browser.newContext({
        permissions: ['geolocation'],
        geolocation:
            town === undefined ? undefined : GEOLOCATION_POSITIONS[town],
    });
    const page = await context.newPage();
    await page.goto('/');

    await mockSearchTracks({
        context: context,
        knownSearches,
    });

    const { userNickname, userID, email, password } = await performSignUp(page);

    await bypassVerifyEmailScreen({ page });

    await focusPage(page);

    return {
        context,
        page,
        userNickname,
        userID,
        email,
        password,
    };
}

export async function focusPage(page: Page): Promise<void> {
    const focusTrap = page.locator('text="Click"').first();
    await focusTrap.click();
}

export async function performSignUp(page: Page): Promise<{
    email: string;
    password: string;
    userNickname: string;
    userID: string;
}> {
    //Go to sign up form
    const goToSignUpFormButton = page.locator(`text="Or sign up ?"`);
    await expect(goToSignUpFormButton).toBeVisible({
        timeout: 30000,
    });
    await goToSignUpFormButton.click();

    const signUpFormContainer = page.locator(
        `css=[data-testid="sign-up-form-screen-container"]`,
    );
    await expect(signUpFormContainer).toBeVisible();

    //Fill sign up form
    const email = unique(() => internet.email());
    const userNickname = unique(() => internet.userName());
    const password = `:net66LTW`;

    //Nickanme
    const yourNicknameInput = page.locator(
        withinSignUpFormScreenContainer(`css=[placeholder="Your nickname"]`),
    );
    await expect(yourNicknameInput).toBeVisible();
    await yourNicknameInput.fill(userNickname);

    //Email
    const yourEmailInput = page.locator(
        withinSignUpFormScreenContainer(`css=[placeholder="Your email"]`),
    );
    await expect(yourEmailInput).toBeVisible();
    await yourEmailInput.fill(email);

    //Password
    const yourPasswordInput = page.locator(
        withinSignUpFormScreenContainer(`css=[placeholder="Your password"]`),
    );
    await expect(yourPasswordInput).toBeVisible();
    await yourPasswordInput.fill(password);

    //Submit sign up form
    const submitSignUpFormButton = page.locator(
        withinSignUpFormScreenContainer(
            `css=[data-testid="submit-sign-up-form-button"]`,
        ),
    );
    await expect(submitSignUpFormButton).toBeVisible();

    const [rawSignUpResponse] = await Promise.all([
        page.waitForResponse(
            (resp) =>
                resp.url().includes('/authentication/sign-up') &&
                resp.status() === 200,
        ),
        submitSignUpFormButton.click(),
    ]);

    const signUpRawBody = await rawSignUpResponse.json();
    const {
        userSummary: { userID, nickname },
    } = SignUpSuccessfullResponseBody.parse(signUpRawBody);

    //Expecting to see the home
    await pageIsOnHomeScreen({ page });

    return {
        email,
        password,
        userNickname: nickname,
        userID,
    };
}

export async function bypassVerifyEmailScreen({
    page,
}: {
    page: Page;
}): Promise<void> {
    await pageIsOnEmailConfirmationScreen({
        page,
    });

    await page.request.get(`${SERVER_ENDPOINT}/test/bypass-email-confirmation`);

    //FIXME TMP should be removed after email polling
    await page.reload();
    ///

    await pageIsOnHomeScreen({
        page,
    });
}

/**
 * Use this function to create tab
 */
export async function createNewTabFromExistingContext(
    context: BrowserContext,
): Promise<{ page: Page }> {
    const page = await context.newPage();
    await page.goto('/');

    await focusPage(page);

    return {
        page,
    };
}

/** */

export async function closeAllContexts(browser: Browser): Promise<void> {
    const contexts = browser.contexts();
    await Promise.all(contexts.map(async (context) => await context.close()));
}
