import { test, expect, Page } from '@playwright/test';
import { internet } from 'faker';
import invariant from 'tiny-invariant';
import {
    pageIsOnEmailConfirmationScreen,
    pageIsOnSignInScreen,
} from './_utils/mpe-e2e-utils';
import {
    closeAllContexts,
    disabledMailTrap,
    GEOLOCATION_POSITIONS,
} from './_utils/page';

test.afterEach(async ({ browser }) => {
    await closeAllContexts(browser);
});

// Remark: to be able to run successfully the following test you have to set up a smtp server and fill the corresponding env variables
// inside your .env.testing file
test('Renders home after resetting password', async ({ browser }) => {
    const aliveInboxContext = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
        baseURL: 'https://temp-mail.org/en/',
    });
    const aliveInboxPage = await aliveInboxContext.newPage();
    await aliveInboxPage.goto('/');

    await disabledMailTrap({ page: aliveInboxPage });

    await aliveInboxPage.waitForTimeout(8000);
    const email = await aliveInboxPage.inputValue('input#mail');

    invariant(email.includes('@'), 'email is not loaded');

    const signUpContext = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
    });
    const signUpPage = await signUpContext.newPage();
    await signUpPage.goto('/');
    await createAccount({
        page: signUpPage,
        email,
    });

    const mainContext = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
    });
    const secondaryContext = await browser.newContext({
        permissions: ['geolocation'],
        geolocation: GEOLOCATION_POSITIONS['Manosque, France'],
    });

    const mainPage = await mainContext.newPage();
    await mainPage.goto('/');
    await pageIsOnSignInScreen({ page: mainPage });

    const otherTabOfMainContext = await mainContext.newPage();
    await otherTabOfMainContext.goto('/');
    await pageIsOnSignInScreen({ page: otherTabOfMainContext });

    await mainPage.fill('css=[placeholder="Email"]', email);
    await mainPage.click('text=Do you lost your password');

    await expect(
        mainPage.locator(
            'text=You should have received an email containing a code',
        ),
    ).toBeVisible();

    const confirmationCode = await getPasswordResetConfirmationCode({
        inboxPage: aliveInboxPage,
    });

    await mainPage.fill(
        'css=[placeholder*="Enter confirmation code"]',
        confirmationCode,
    );
    await mainPage.click('text="Submit" >> visible=true');

    await expect(
        mainPage.locator('text=Please enter your new password'),
    ).toBeVisible();

    const newPassword = '-New password01-';
    await mainPage.fill('css=[placeholder*="Enter new password"]', newPassword);
    await mainPage.click(
        'css=[data-testid="submit-password-reset-new-password-button"] >> text="Submit"',
    );

    await pageIsOnEmailConfirmationScreen({ page: mainPage });
    await pageIsOnEmailConfirmationScreen({ page: otherTabOfMainContext });

    const pageOfOtherDevice = await secondaryContext.newPage();
    await pageOfOtherDevice.goto('/');

    await pageIsOnSignInScreen({ page: pageOfOtherDevice });

    await signIn({
        page: pageOfOtherDevice,
        email,
        password: newPassword,
    });

    await pageIsOnEmailConfirmationScreen({ page: pageOfOtherDevice });
});

async function signIn({
    page,
    email,
    password,
}: {
    page: Page;
    email: string;
    password: string;
}) {
    const emailInput = page.locator('css=[placeholder="Email"]');
    await emailInput.fill(email);

    const passwordInput = page.locator('css=[placeholder="Password"]');
    await passwordInput.fill(password);

    const submitSignInFormButton = page.locator('text="Log in"');
    await submitSignInFormButton.click();
}

async function createAccount({ page, email }: { page: Page; email: string }) {
    await pageIsOnSignInScreen({ page });

    await page.click('text="Or sign up ?"');

    await expect(page.locator('text="To party sign up !"')).toBeVisible();

    await page.fill('[placeholder="Nickname"]', internet.userName());
    await page.fill('[placeholder="Email"]', email);
    await page.fill('[placeholder="Password"]', 'adfg=1435&*&*(SjhgA');

    await page.click('text="Sign Up"');

    await pageIsOnEmailConfirmationScreen({ page });

    await page.close();
}

async function getPasswordResetConfirmationCode({
    inboxPage,
}: {
    inboxPage: Page;
}): Promise<string> {
    /**
     * The subject of the password reset email has the following format:
     *
     * ```txt
     * [123456] Reset your password
     * ```
     */
    const passwordResetEmailSubject = inboxPage
        .locator(`a >> text=/reset.*your.*password/i`)
        .first();

    const passwordResetEmailSubjectTextContent =
        await passwordResetEmailSubject.textContent({
            timeout: 30000,
        });

    invariant(
        passwordResetEmailSubjectTextContent !== null,
        'The subject of reset password email must have been found',
    );

    const tokenExtractResult = /\[(?<token>\d{6})]/.exec(
        passwordResetEmailSubjectTextContent,
    );
    invariant(
        tokenExtractResult !== null,
        'The regex must have located the token',
    );
    const token = tokenExtractResult.groups?.token;
    invariant(
        token !== undefined,
        'The token must have been extracted inside a named group',
    );

    expect(token.length).toBe(6);

    return token;
}
