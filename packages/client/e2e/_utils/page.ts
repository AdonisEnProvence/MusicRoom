import { Browser, Page, BrowserContext, expect } from '@playwright/test';
import { internet, unique } from 'faker';
import {
    SignUpSuccessfullResponseBody,
    ToggleMailTrafRequestBody,
} from '@musicroom/types';
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

async function sendToggleMailTrap({
    body,
    page,
}: {
    page: Page;
    body: ToggleMailTrafRequestBody;
}): Promise<void> {
    await page.request.post(`${SERVER_ENDPOINT}/test/toggle-mail-trap`, {
        data: body,
    });
}

/**
 * This function should be called at the begin of a test that
 * uses Alive Inbox email verification method or overall that you want to
 * send emails
 */
export async function disabledMailTrap({
    page,
}: {
    page: Page;
}): Promise<void> {
    await sendToggleMailTrap({
        body: {
            status: 'DISABLE',
        },
        page,
    });
}

/**
 * By calling this function you will activate in the adonis server the mail trap
 * That means no mail will be sent at all
 */
export async function enableMailTrap({ page }: { page: Page }): Promise<void> {
    await sendToggleMailTrap({
        body: {
            status: 'ENABLE',
        },
        page,
    });
}

type SetupAndGetUserContextArgs = {
    browser: Browser;
    knownSearches: KnownSearchesRecord;
    doNotByPassEmailVerification?: boolean;
    town?: keyof typeof GEOLOCATION_POSITIONS;
};
export async function setupPageAndSignUpUser({
    browser,
    knownSearches,
    town,
    doNotByPassEmailVerification,
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

    //Disabled mail shipment using test e2e private route
    await enableMailTrap({
        page,
    });

    await mockSearchTracks({
        context: context,
        knownSearches,
    });

    const { userNickname, userID, email, password } = await performSignUp(page);

    if (doNotByPassEmailVerification) {
        return {
            context,
            page,
            userNickname,
            userID,
            email,
            password,
        };
    }

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
    const focusTrap = page.locator('text="Give focus"');

    await Promise.all([expect(focusTrap).not.toBeVisible(), focusTrap.click()]);
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
        withinSignUpFormScreenContainer(`css=[placeholder="Nickname"]`),
    );
    await expect(yourNicknameInput).toBeVisible();
    await yourNicknameInput.fill(userNickname);

    //Email
    const yourEmailInput = page.locator(
        withinSignUpFormScreenContainer(`css=[placeholder="Email"]`),
    );
    await expect(yourEmailInput).toBeVisible();
    await yourEmailInput.fill(email);

    //Password
    const yourPasswordInput = page.locator(
        withinSignUpFormScreenContainer(`css=[placeholder="Password"]`),
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

    await pageIsOnEmailConfirmationScreen({ page });

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

    await pageIsOnHomeScreen({
        page,
        timeout: 10000,
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
