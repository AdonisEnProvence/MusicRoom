import { test, expect, Page } from '@playwright/test';
import { internet } from 'faker';
import invariant from 'tiny-invariant';
import { mockSearchTracks } from './_utils/mock-http';
import {
    knownSearches,
    pageIsOnEmailConfirmationScreen,
    pageIsOnHomeScreen,
    pageIsOnSignInScreen,
} from './_utils/mpe-e2e-utils';
import { closeAllContexts, GEOLOCATION_POSITIONS } from './_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

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

    //Could be improve using waitForSelector and complex css selector + regex ?
    await aliveInboxPage.waitForTimeout(4000);
    const myEmail = await aliveInboxPage.inputValue('input#mail');
    console.log({ myEmail });

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

    await page.fill('[placeholder="Your nickname"]', internet.userName());
    await page.fill('[placeholder="Your email"]', myEmail);
    await page.fill('[placeholder="Your password"]', 'adfg=1435&*&*(SjhgA');

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

    console.log({ emailVerificationSubjectTextContent });
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
    console.log({ token });

    await verifyEmail({ page, token });

    await Promise.all(
        everyUserFirstContextPage.map(
            async (page) => await pageIsOnHomeScreen({ page }),
        ),
    );
    await pageIsOnSignInScreen({ page: secondContextPage });
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
