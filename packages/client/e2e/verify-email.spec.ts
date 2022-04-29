import { test, expect, Page } from '@playwright/test';
import { internet } from 'faker';
import invariant from 'tiny-invariant';
import { mockSearchTracks } from './_utils/mock-http';
import {
    knownSearches,
    pageIsOnEmailConfirmationScreen,
    pageIsOnHomeScreen,
    pageIsOnSignInScreen,
    withinSignUpFormScreenContainer,
} from './_utils/mpe-e2e-utils';
import {
    closeAllContexts,
    disabledMailTrap,
    enableMailTrap,
    GEOLOCATION_POSITIONS,
} from './_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

//Remark: to be able to run successfully the following test you have to set up a smtp server and fill the corresponding env variables
//inside your .env.testing file

test('It should renders home on every browser tab after a signUp and verify email', async ({
    browser,
}) => {
    //get my email address
    const aliveInboxContext = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
        baseURL: 'https://temp-mail.org/en/',
    });
    const aliveInboxPage = await aliveInboxContext.newPage();
    await aliveInboxPage.goto('/');

    await disabledMailTrap({ page: aliveInboxPage });

    //Could be improve using waitForSelector and complex css selector + regex ?
    await aliveInboxPage.waitForTimeout(8000);
    const myEmail = await aliveInboxPage.inputValue('input#mail');

    invariant(myEmail.includes('@'), 'email is not loaded');
    ///

    const context = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
        baseURL: 'http://localhost:4000/',
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

    const everyUserFirstContextPage: Page[] = [page, newTab1, newTab2];

    await pageIsOnSignInScreen({ page });

    await page.click('text="Or sign up ?"');

    await expect(page.locator('text="To party sign up !"')).toBeVisible();

    const userName = internet.userName();
    await page.fill(
        withinSignUpFormScreenContainer('[placeholder="Nickname"]'),
        userName,
    );
    await page.fill(
        withinSignUpFormScreenContainer('[placeholder="Email"]'),
        myEmail,
    );
    const password = 'adfg=1435&*&*(SjhgA';
    await page.fill(
        withinSignUpFormScreenContainer('[placeholder="Password"]'),
        password,
    );

    await page.click('text="Sign Up"');

    await Promise.all(
        everyUserFirstContextPage.map(
            async (page) => await pageIsOnEmailConfirmationScreen({ page }),
        ),
    );
    await pageIsOnSignInScreen({ page: secondContextPage });

    //email verification object template:
    //'[TOKEN] - Musicroom. Welcome NICKNAME, please verify your email !'
    //First should not be required but is safer, for the moment between each test temp-mail will generate a new email address
    const emailVerificationSubject = aliveInboxPage
        .locator(`a >> text=/.*Welcome.*,.*please.*verify.*your.*email.*!/i`)
        .first();
    await expect(emailVerificationSubject).toBeVisible({
        timeout: 30000,
    });

    const emailVerificationSubjectTextContent =
        await emailVerificationSubject.textContent();

    expect(emailVerificationSubjectTextContent).not.toBeNull();
    invariant(
        emailVerificationSubjectTextContent !== null,
        'emailVerificationSubjectTextContent is null',
    );

    const token = emailVerificationSubjectTextContent.substring(
        emailVerificationSubjectTextContent.indexOf('[') + 1,
        emailVerificationSubjectTextContent.lastIndexOf(']'),
    );
    expect(token.length).toBe(6);

    await verifyEmail({ page, token });

    await Promise.all(
        everyUserFirstContextPage.map(
            async (page) => await pageIsOnHomeScreen({ page, timeout: 6000 }),
        ),
    );
    await pageIsOnSignInScreen({ page: secondContextPage });
    await enableMailTrap({
        page,
    });
});

async function verifyEmail({
    page,
    token,
}: {
    page: Page;
    token: string;
}): Promise<void> {
    await pageIsOnEmailConfirmationScreen({
        page,
    });

    const confirmationCodeTextInput = page.locator(
        'css=[placeholder="Enter confirmation code..."]',
    );
    await expect(confirmationCodeTextInput).toBeVisible();
    await confirmationCodeTextInput.fill(token);

    const submitEmailVerificationCode = page.locator(
        `css=[data-testid="submit-email-verification-code-button"]`,
    );
    await expect(submitEmailVerificationCode).toBeVisible();
    await submitEmailVerificationCode.click();

    await pageIsOnHomeScreen({
        page,
    });
}
