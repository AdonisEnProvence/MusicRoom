import Database from '@ioc:Adonis/Lucid/Database';
import Hash from '@ioc:Adonis/Core/Hash';
import {
    ConfirmEmailRequestBody,
    ConfirmEmailResponseBody,
    GetMyProfileInformationResponseBody,
    RequestPasswordResetRequestBody,
    RequestPasswordResetResponseBody,
    ResendConfirmationEmailResponseBody,
    ResetPasswordRequestBody,
    ResetPasswordResponseBody,
    ResetPasswordSuccessfulApiAuthenticationResponseBody,
    ResetPasswordSuccessfulWebAuthenticationResponseBody,
    SignInFailureResponseBody,
    SignInRequestBody,
    SignInSuccessfulApiTokensResponseBody,
    SignInSuccessfulWebAuthResponseBody,
    SignOutResponseBody,
    TokenTypeName,
    ValidatePasswordResetTokenRequestBody,
    ValidatePasswordResetTokenResponseBody,
} from '@musicroom/types';
import { DateTime } from 'luxon';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import { spy } from 'sinon';
import cheerio from 'cheerio';
import Mail, { MessageNode } from '@ioc:Adonis/Addons/Mail';
import TokenType from 'App/Models/TokenType';
import invariant from 'tiny-invariant';
import {
    BASE_URL,
    generateArray,
    generateStrongPassword,
    initTestUtils,
    noop,
} from '../../../tests/utils/TestUtils';

test.group('AuthenticationController', (group) => {
    const { initSocketConnection, disconnectEveryRemainingSocketConnection } =
        initTestUtils();

    group.beforeEach(async () => {
        Mail.trap(noop);
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        await Database.rollbackGlobalTransaction();
    });

    test('Retrieves information of users logged in with web guard', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const userUnhashedPassword = "Popol l'est gentil";
        const user = await User.create({
            nickname: 'Popol',
            email: 'gentil-popol@gmail.com',
            password: userUnhashedPassword,
        });

        const signInRequestBody: SignInRequestBody = {
            email: user.email,
            password: userUnhashedPassword,
            authenticationMode: 'web',
        };
        const signInResponse = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(200);
        const parsedSignInResponse = SignInSuccessfulWebAuthResponseBody.parse(
            signInResponse.body,
        );
        assert.deepStrictEqual<SignInSuccessfulWebAuthResponseBody>(
            parsedSignInResponse,
            {
                status: 'SUCCESS',
                userSummary: {
                    nickname: user.nickname,
                    userID: user.uuid,
                },
            },
        );

        const responseSetCookies = signInResponse.header['set-cookie'];
        assert.isDefined(responseSetCookies);
        assert.isTrue(responseSetCookies.length > 0);

        const getMyProfileRawResponse = await request
            .get('/me/profile-information')
            .expect(200)
            .expect('Content-Type', /json/);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userNickname, user.nickname);
        assert.equal(getMyProfileParsedBody.userID, user.uuid);
    });

    test('Retrieves information of users logged in with api guard', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const userUnhashedPassword = "Popol l'est gentil";
        const user = await User.create({
            nickname: 'Popol',
            email: 'gentil-popol@gmail.com',
            password: userUnhashedPassword,
        });

        const signInRequestBody: SignInRequestBody = {
            email: user.email,
            password: userUnhashedPassword,
            authenticationMode: 'api',
        };
        const signInResponse = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(200);
        const parsedSignInResponse =
            SignInSuccessfulApiTokensResponseBody.parse(signInResponse.body);
        assert.deepStrictEqual<SignInSuccessfulApiTokensResponseBody>(
            parsedSignInResponse,
            {
                status: 'SUCCESS',
                token: parsedSignInResponse.token,
                userSummary: {
                    nickname: user.nickname,
                    userID: user.uuid,
                },
            },
        );
        const authToken = parsedSignInResponse.token;

        const getMyProfileRawResponse = await request
            .get('/me/profile-information')
            .set('Authorization', `bearer ${authToken}`)
            .expect(200)
            .expect('Content-Type', /json/);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userNickname, user.nickname);
        assert.equal(getMyProfileParsedBody.userID, user.uuid);
    });

    test('Returns an error when provided email is unknown for web auth', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const signInRequestBody: SignInRequestBody = {
            email: 'invalid-email@gmail.com',
            password: 'azerty',
            authenticationMode: 'web',
        };
        const signInResponse = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(403);
        const parsedSignInResponse = SignInFailureResponseBody.parse(
            signInResponse.body,
        );
        assert.deepStrictEqual<SignInFailureResponseBody>(
            parsedSignInResponse,
            {
                status: 'INVALID_CREDENTIALS',
            },
        );
    });

    test("Returns an error when provided password does not match user's password for web auth", async (assert) => {
        const request = supertest.agent(BASE_URL);

        const userUnhashedPassword = "Popol l'est gentil";
        const user = await User.create({
            nickname: 'Popol',
            email: 'gentil-popol@gmail.com',
            password: userUnhashedPassword,
        });

        const signInRequestBody: SignInRequestBody = {
            email: user.email,
            password: 'invalid password',
            authenticationMode: 'web',
        };
        const signInResponse = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(403);
        const parsedSignInResponse = SignInFailureResponseBody.parse(
            signInResponse.body,
        );
        assert.deepStrictEqual<SignInFailureResponseBody>(
            parsedSignInResponse,
            {
                status: 'INVALID_CREDENTIALS',
            },
        );
    });

    test('Returns an error when provided email is unknown for api auth', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const signInRequestBody: SignInRequestBody = {
            email: 'invalid-email@gmail.com',
            password: 'azerty',
            authenticationMode: 'api',
        };
        const signInResponse = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(403);
        const parsedSignInResponse = SignInFailureResponseBody.parse(
            signInResponse.body,
        );
        assert.deepStrictEqual<SignInFailureResponseBody>(
            parsedSignInResponse,
            {
                status: 'INVALID_CREDENTIALS',
            },
        );
    });

    test("Returns an error when provided password does not match user's password for api auth", async (assert) => {
        const request = supertest.agent(BASE_URL);

        const userUnhashedPassword = "Popol l'est gentil";
        const user = await User.create({
            nickname: 'Popol',
            email: 'gentil-popol@gmail.com',
            password: userUnhashedPassword,
        });

        const signInRequestBody: SignInRequestBody = {
            email: user.email,
            password: 'invalid password',
            authenticationMode: 'api',
        };
        const signInResponse = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(403);
        const parsedSignInResponse = SignInFailureResponseBody.parse(
            signInResponse.body,
        );
        assert.deepStrictEqual<SignInFailureResponseBody>(
            parsedSignInResponse,
            {
                status: 'INVALID_CREDENTIALS',
            },
        );
    });

    test('It should sign out api token authenticated user', async (assert) => {
        const email = internet.email();
        const password = generateStrongPassword();
        await User.create({
            nickname: 'Popol',
            email,
            password,
        });

        const signInRequestBody: SignInRequestBody = {
            email,
            password,
            authenticationMode: 'api',
        };
        const signInResponse = await supertest(BASE_URL)
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(200);

        const signInResponseBody = SignInSuccessfulApiTokensResponseBody.parse(
            signInResponse.body,
        );
        const authToken = signInResponseBody.token;

        const signOutResponse = await supertest(BASE_URL)
            .get('/authentication/sign-out')
            .set('Authorization', `bearer ${authToken}`)
            .expect(200);

        const parsedBody = SignOutResponseBody.parse(signOutResponse.body);
        assert.equal(parsedBody.status, 'SUCCESS');

        await supertest(BASE_URL)
            .get('/me/profile-information')
            .set('Authorization', `bearer ${authToken}`)
            .expect(401);
    });

    test('It should sign out web auth authenticated user', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const email = internet.email();
        const password = generateStrongPassword();
        await User.create({
            nickname: 'Popol',
            email,
            password,
        });

        const signInRequestBody: SignInRequestBody = {
            email,
            password,
            authenticationMode: 'web',
        };
        const signInResponse = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(200);

        SignInSuccessfulWebAuthResponseBody.parse(signInResponse.body);

        const signOutResponse = await request
            .get('/authentication/sign-out')
            .expect(200);

        const parsedBody = SignOutResponseBody.parse(signOutResponse.body);
        assert.equal(parsedBody.status, 'SUCCESS');

        await request.get('/me/profile-information').expect(401);
    });

    test('It should throw an error as signing out user is not authenticated', async () => {
        const request = supertest.agent(BASE_URL);

        const email = internet.email();
        const password = generateStrongPassword();
        await User.create({
            nickname: 'Popol',
            email,
            password,
        });

        await request.get('/authentication/sign-out').expect(401);
    });
});

test.group('Confirm email', (group) => {
    const {
        initSocketConnection,
        disconnectEveryRemainingSocketConnection,
        createUserAndAuthenticate,
    } = initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        await Database.rollbackGlobalTransaction();
    });

    test('Returns an authentication error when current user is not authenticated', async () => {
        const request = supertest.agent(BASE_URL);

        const requestBody: ConfirmEmailRequestBody = {
            token: '123456',
        };
        await request
            .post('/authentication/confirm-email')
            .send(requestBody)
            .expect(401);
    });

    test("Confirms user's email with a valid token", async (assert) => {
        const request = supertest.agent(BASE_URL);

        const emailIsNotConfirmed = true;
        const user = await createUserAndAuthenticate(
            request,
            emailIsNotConfirmed,
        );

        const validToken = '123456';
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.EMAIL_CONFIRMATION,
        );
        const futureDateTime = DateTime.local().plus({
            minutes: 15,
        });
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: validToken,
            expiresAt: futureDateTime,
        });

        const requestBody: ConfirmEmailRequestBody = {
            token: validToken,
        };
        const response = await request
            .post('/authentication/confirm-email')
            .send(requestBody)
            .expect(200);
        const parsedResponseBody = ConfirmEmailResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'SUCCESS',
        });

        await user.refresh();

        assert.instanceOf(user.confirmedEmailAt, DateTime);
    });

    test("Does not confirm user's email when token is valid but has expired", async (assert) => {
        const request = supertest.agent(BASE_URL);

        const emailIsNotConfirmed = true;
        const user = await createUserAndAuthenticate(
            request,
            emailIsNotConfirmed,
        );

        const validToken = '123456';
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.EMAIL_CONFIRMATION,
        );
        const oneHourAgoDateTime = DateTime.local().minus({
            hour: 1,
        });
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: validToken,
            expiresAt: oneHourAgoDateTime,
        });

        const requestBody: ConfirmEmailRequestBody = {
            token: validToken,
        };
        const response = await request
            .post('/authentication/confirm-email')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ConfirmEmailResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'INVALID_TOKEN',
        });

        await user.refresh();

        assert.isNull(user.confirmedEmailAt);
    });

    test("Does not confirm user's email when confirmation code is invalid", async (assert) => {
        const request = supertest.agent(BASE_URL);

        const emailIsNotConfirmed = true;
        const user = await createUserAndAuthenticate(
            request,
            emailIsNotConfirmed,
        );
        const INVALID_CONFIRMATION_CODE = 'adgfhjadfg';

        const validToken = '123456';
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.EMAIL_CONFIRMATION,
        );
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: validToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        const requestBody: ConfirmEmailRequestBody = {
            token: INVALID_CONFIRMATION_CODE,
        };
        const response = await request
            .post('/authentication/confirm-email')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ConfirmEmailResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'INVALID_TOKEN',
        });

        await user.refresh();

        assert.isNull(user.confirmedEmailAt);
    });

    test('Tokens are not stored in plain text', async (assert) => {
        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const tokenValue = '123456';
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.EMAIL_CONFIRMATION,
        );
        const token = await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: tokenValue,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        assert.notEqual(token.value, tokenValue);
    });

    test('Returns an authorization error when trying confirm the email that has already been confirmed', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const user = await createUserAndAuthenticate(request);

        const now = DateTime.now();
        user.confirmedEmailAt = now;
        await user.save();

        const requestBody: ConfirmEmailRequestBody = {
            token: '123456',
        };
        await request
            .post('/authentication/confirm-email')
            .send(requestBody)
            .expect(403);

        await user.refresh();

        assert.isTrue(now.equals(user.confirmedEmailAt));
    });
});

test.group('Resending confirmation email', (group) => {
    const {
        initSocketConnection,
        disconnectEveryRemainingSocketConnection,
        createUserAndAuthenticate,
        waitFor,
        waitForSettled,
        generateToken,
    } = initTestUtils();

    group.beforeEach(async () => {
        Mail.trap(noop);
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        Mail.restore();
        await disconnectEveryRemainingSocketConnection();
        await Database.rollbackGlobalTransaction();
    });

    test('Returns an authentication error when current user is not authenticated', async () => {
        const request = supertest.agent(BASE_URL);

        await request
            .post('/authentication/resend-confirmation-email')
            .expect(401);
    });

    test('Resends a confirmation email if rate limit has not been reached', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const user = await createUserAndAuthenticate(request);
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.EMAIL_CONFIRMATION,
        );
        await user.related('tokens').createMany(
            generateArray({
                minLength: 2,
                maxLength: 2,
                fill: () => ({
                    uuid: datatype.uuid(),
                    tokenTypeUuid: tokenType.uuid,
                    value: generateToken(),
                    expiresAt: DateTime.local().minus({
                        minutes: datatype.number({
                            min: 1,
                            max: 59,
                        }),
                    }),
                }),
            }),
        );

        const mailTrapEmailVerificationSpy =
            spy<(message: MessageNode) => void>(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

        const resendConfirmationEmailRawResponse = await request
            .post('/authentication/resend-confirmation-email')
            .expect(200);
        const resendConfirmationEmailResponse =
            ResendConfirmationEmailResponseBody.parse(
                resendConfirmationEmailRawResponse.body,
            );
        assert.deepStrictEqual(resendConfirmationEmailResponse, {
            status: 'SUCCESS',
        });

        await waitFor(() => {
            assert.isTrue(mailTrapEmailVerificationSpy.calledOnce);
        });

        {
            const message = mailTrapEmailVerificationSpy.lastCall.args[0];

            assert.deepStrictEqual(message.to, [
                {
                    address: user.email,
                    name: user.nickname,
                },
            ]);

            assert.deepEqual(message.from, {
                address: 'no-reply@adonisenprovence.com',
                name: 'MusicRoom',
            });

            const subject = message.subject;
            invariant(
                subject !== undefined,
                'The subject of the message must be defined',
            );

            const emailVerificationObjectRegex =
                /\[.*].*Welcome.*,.*please.*verify.*your.*email.*!/i;
            assert.match(subject, emailVerificationObjectRegex);
            assert.include(subject, user.nickname);

            const html = message.html;
            invariant(
                html !== undefined,
                'HTML content of the email must be defined',
            );

            const $ = cheerio.load(html);
            const tokenElement = $('[data-testid="token"]');
            const tokenValue = tokenElement.text().trim();
            assert.match(tokenValue, /^\d{6}$/);
        }
    });

    test("Can use token from resent confirmation email to confirm user's account", async (assert) => {
        const request = supertest.agent(BASE_URL);

        const emailIsNotConfirmed = true;
        const user = await createUserAndAuthenticate(
            request,
            emailIsNotConfirmed,
        );

        const mailTrapEmailVerificationSpy =
            spy<(message: MessageNode) => void>(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

        await request
            .post('/authentication/resend-confirmation-email')
            .expect(200);

        await waitFor(() => {
            assert.isTrue(mailTrapEmailVerificationSpy.calledOnce);
        });

        const message = mailTrapEmailVerificationSpy.lastCall.args[0];
        const html = message.html;
        invariant(
            html !== undefined,
            'HTML content of the email must be defined',
        );

        const $ = cheerio.load(html);
        const tokenElement = $('[data-testid="token"]');
        const tokenValue = tokenElement.text().trim();

        const requestBody: ConfirmEmailRequestBody = {
            token: tokenValue,
        };
        const response = await request
            .post('/authentication/confirm-email')
            .send(requestBody)
            .expect(200);
        const parsedResponseBody = ConfirmEmailResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'SUCCESS',
        });

        await user.refresh();

        assert.instanceOf(user.confirmedEmailAt, DateTime);
    });

    test('Does not resend confirmation email if rate limit has been reached', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const user = await createUserAndAuthenticate(request);

        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.EMAIL_CONFIRMATION,
        );
        await user.related('tokens').createMany(
            generateArray({
                minLength: 3,
                maxLength: 6,
                fill: () => ({
                    uuid: datatype.uuid(),
                    tokenTypeUuid: tokenType.uuid,
                    value: generateToken(),
                    expiresAt: DateTime.local().minus({
                        minutes: datatype.number({
                            min: 1,
                            max: 59,
                        }),
                    }),
                }),
            }),
        );

        const mailTrapEmailVerificationSpy = spy();
        Mail.trap(mailTrapEmailVerificationSpy);

        const resendConfirmationEmailRawResponse = await request
            .post('/authentication/resend-confirmation-email')
            .expect(429);
        const resendConfirmationEmailResponse =
            ResendConfirmationEmailResponseBody.parse(
                resendConfirmationEmailRawResponse.body,
            );
        assert.deepStrictEqual(resendConfirmationEmailResponse, {
            status: 'REACHED_RATE_LIMIT',
        });

        await waitForSettled(() => {
            assert.isTrue(mailTrapEmailVerificationSpy.notCalled);
        });
    });
});

test.group('Request password reset', (group) => {
    const { waitFor, waitForSettled, createRequest, generateToken } =
        initTestUtils();

    group.beforeEach(async () => {
        Mail.trap(noop);
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        Mail.restore();
        await Database.rollbackGlobalTransaction();
    });

    test('Returns an error when provided email does not correspond to a user that exists', async (assert) => {
        const request = createRequest();

        const mailTrapPasswordResetSpy = spy();
        Mail.trap(mailTrapPasswordResetSpy);

        const requestBody: RequestPasswordResetRequestBody = {
            email: internet.email(),
        };
        const rawResponse = await request
            .post('/authentication/request-password-reset')
            .send(requestBody)
            .expect(404);
        const { status } = RequestPasswordResetResponseBody.parse(
            rawResponse.body,
        );

        assert.equal(status, 'INVALID_EMAIL');

        await waitForSettled(() => {
            assert.isTrue(mailTrapPasswordResetSpy.notCalled);
        });
    });

    test('Returns an error when user corresponding to provided email has exceeded rate limit', async (assert) => {
        const request = createRequest();

        const mailTrapPasswordResetSpy = spy();
        Mail.trap(mailTrapPasswordResetSpy);

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        await user.related('tokens').createMany(
            generateArray({
                minLength: 3,
                maxLength: 6,
                fill: () => ({
                    uuid: datatype.uuid(),
                    tokenTypeUuid: tokenType.uuid,
                    value: generateToken(),
                    expiresAt: DateTime.local().minus({
                        minutes: datatype.number({
                            min: 1,
                            max: 59,
                        }),
                    }),
                }),
            }),
        );

        const requestBody: RequestPasswordResetRequestBody = {
            email: user.email,
        };
        const rawResponse = await request
            .post('/authentication/request-password-reset')
            .send(requestBody)
            .expect(429);
        const { status } = RequestPasswordResetResponseBody.parse(
            rawResponse.body,
        );

        assert.equal(status, 'REACHED_RATE_LIMIT');

        await waitForSettled(() => {
            assert.isTrue(mailTrapPasswordResetSpy.notCalled);
        });
    });

    test('Sends email when password reset is authorized', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        await user.related('tokens').createMany(
            generateArray({
                minLength: 2,
                maxLength: 2,
                fill: () => ({
                    uuid: datatype.uuid(),
                    tokenTypeUuid: tokenType.uuid,
                    value: generateToken(),
                    expiresAt: DateTime.local().minus({
                        minutes: datatype.number({
                            min: 1,
                            max: 59,
                        }),
                    }),
                }),
            }),
        );

        const mailTrapPasswordResetSpy =
            spy<(message: MessageNode) => void>(noop);
        Mail.trap(mailTrapPasswordResetSpy);

        const requestBody: RequestPasswordResetRequestBody = {
            email: user.email,
        };
        const rawResponse = await request
            .post('/authentication/request-password-reset')
            .send(requestBody)
            .expect(200);
        const { status } = RequestPasswordResetResponseBody.parse(
            rawResponse.body,
        );

        assert.equal(status, 'SUCCESS');

        await waitFor(() => {
            assert.isTrue(mailTrapPasswordResetSpy.calledOnce);
        });

        {
            const message = mailTrapPasswordResetSpy.lastCall.args[0];

            assert.deepStrictEqual(message.to, [
                {
                    address: user.email,
                    name: user.nickname,
                },
            ]);

            assert.deepEqual(message.from, {
                address: 'no-reply@adonisenprovence.com',
                name: 'MusicRoom',
            });

            const subject = message.subject;
            invariant(
                subject !== undefined,
                'The subject of the message must be defined',
            );

            const passwordResetSubjectRegex = /\[\d{6}].*reset.*password/i;
            assert.match(subject, passwordResetSubjectRegex);

            const html = message.html;
            invariant(
                html !== undefined,
                'HTML content of the email must be defined',
            );

            const $ = cheerio.load(html);
            const tokenElement = $('[data-testid="token"]');
            const tokenValue = tokenElement.text().trim();
            assert.match(tokenValue, /^\d{6}$/);
        }
    });
});

test.group('Validate password reset token', (group) => {
    const { createRequest, generateToken } = initTestUtils();

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('Returns token is valid if token is not expired and belongs to user with provided email', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        const requestBody: ValidatePasswordResetTokenRequestBody = {
            token: plainToken,
            email: user.email,
        };
        const response = await request
            .post('/authentication/validate-password-reset-token')
            .send(requestBody)
            .expect(200);
        const parsedResponseBody = ValidatePasswordResetTokenResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'SUCCESS',
        });
    });

    test('Returns error when no user exist with provided email', async (assert) => {
        const request = createRequest();

        const requestBody: ValidatePasswordResetTokenRequestBody = {
            token: generateToken(),
            email: internet.email(),
        };
        const response = await request
            .post('/authentication/validate-password-reset-token')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ValidatePasswordResetTokenResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'INVALID_TOKEN',
        });
    });

    test('Returns error if no token match with provided token', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        const requestBody: ValidatePasswordResetTokenRequestBody = {
            token: generateToken(),
            email: user.email,
        };
        const response = await request
            .post('/authentication/validate-password-reset-token')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ValidatePasswordResetTokenResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'INVALID_TOKEN',
        });
    });

    test('Returns error if token has expired', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        const twoHoursAgo = DateTime.local().minus({
            hours: 2,
        });
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: twoHoursAgo,
        });

        const requestBody: ValidatePasswordResetTokenRequestBody = {
            token: plainToken,
            email: user.email,
        };
        const response = await request
            .post('/authentication/validate-password-reset-token')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ValidatePasswordResetTokenResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'INVALID_TOKEN',
        });
    });
});

test.group('Reset password', (group) => {
    const { createRequest, generateToken } = initTestUtils();

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('Returns an error if provided email does not exist', async (assert) => {
        const request = createRequest();

        const requestBody: ResetPasswordRequestBody = {
            token: generateToken(),
            email: internet.email(),
            password: internet.password(),
            authenticationMode: 'web',
        };
        const response = await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ResetPasswordResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'INVALID_TOKEN',
        });
    });

    test('Returns an error if token does not exist', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const requestBody: ResetPasswordRequestBody = {
            token: generateToken(),
            email: user.email,
            password: internet.password(),
            authenticationMode: 'web',
        };
        const response = await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ResetPasswordResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'INVALID_TOKEN',
        });
    });

    test('Returns an error if token is expired', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        const twoHoursAgo = DateTime.local().minus({
            hours: 2,
        });
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: twoHoursAgo,
        });

        const requestBody: ResetPasswordRequestBody = {
            token: plainToken,
            email: user.email,
            password: internet.password(),
            authenticationMode: 'web',
        };
        const response = await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ResetPasswordResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'INVALID_TOKEN',
        });
    });

    test('Returns an error if password is not strong enough', async () => {
        const request = createRequest();

        const userPlainPassword = 'weak';
        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: userPlainPassword,
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        const requestBody: ResetPasswordRequestBody = {
            token: plainToken,
            email: user.email,
            password: userPlainPassword,
            authenticationMode: 'web',
        };
        await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(500);
    });

    test('Returns an error if password is already used by the user', async (assert) => {
        const request = createRequest();

        const userPlainPassword = internet.password();
        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: userPlainPassword,
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        const requestBody: ResetPasswordRequestBody = {
            token: plainToken,
            email: user.email,
            password: userPlainPassword,
            authenticationMode: 'web',
        };
        const response = await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ResetPasswordResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'PASSWORD_ALREADY_USED',
        });
    });

    test('Authenticates user with web mode if provided information are correct', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        const newPlainPassword = internet.password();
        const requestBody: ResetPasswordRequestBody = {
            token: plainToken,
            email: user.email,
            password: newPlainPassword,
            authenticationMode: 'web',
        };
        const response = await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(200);
        const parsedResponseBody =
            ResetPasswordSuccessfulWebAuthenticationResponseBody.parse(
                response.body,
            );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'SUCCESS',
        });

        await user.refresh();

        invariant(
            user.password !== undefined,
            'The hashed password of the user must have been computed',
        );
        const hasPasswordChanged =
            (await Hash.verify(user.password, newPlainPassword)) === true;

        assert.isTrue(hasPasswordChanged);

        const getMyProfileRawResponse = await request
            .get('/me/profile-information')
            .expect(200);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userID, user.uuid);
    });

    test('Authenticates user with api mode if provided information are correct', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        const newPlainPassword = internet.password();
        const requestBody: ResetPasswordRequestBody = {
            token: plainToken,
            email: user.email,
            password: newPlainPassword,
            authenticationMode: 'api',
        };
        const response = await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(200);
        const parsedResponseBody =
            ResetPasswordSuccessfulApiAuthenticationResponseBody.parse(
                response.body,
            );

        assert.equal(parsedResponseBody.status, 'SUCCESS');

        await user.refresh();

        invariant(
            user.password !== undefined,
            'The hashed password of the user must have been computed',
        );
        const hasPasswordChanged =
            (await Hash.verify(user.password, newPlainPassword)) === true;

        assert.isTrue(hasPasswordChanged);

        const getMyProfileRawResponse = await request
            .get('/me/profile-information')
            .set('Authorization', `Bearer ${parsedResponseBody.token}`)
            .expect(200);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userID, user.uuid);
    });

    test('Revokes token if provided information are correct', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        const token = await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        const requestBody: ResetPasswordRequestBody = {
            token: plainToken,
            email: user.email,
            password: internet.password(),
            authenticationMode: 'web',
        };
        const response = await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(200);
        const parsedResponseBody =
            ResetPasswordSuccessfulWebAuthenticationResponseBody.parse(
                response.body,
            );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'SUCCESS',
        });

        await token.refresh();

        assert.isTrue(token.isRevoked);
    });

    test('Does not revoke token if provided password is same as old password', async (assert) => {
        const request = createRequest();

        const plainPassword = internet.password();
        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: plainPassword,
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        const token = await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),
        });

        const requestBody: ResetPasswordRequestBody = {
            token: plainToken,
            email: user.email,
            password: plainPassword,
            authenticationMode: 'web',
        };
        const response = await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ResetPasswordResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'PASSWORD_ALREADY_USED',
        });

        await token.refresh();

        assert.isFalse(token.isRevoked);
    });

    test('Returns an error when token is revoked', async (assert) => {
        const request = createRequest();

        const user = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const plainToken = generateToken();
        const tokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        await user.related('tokens').create({
            uuid: datatype.uuid(),
            tokenTypeUuid: tokenType.uuid,
            value: plainToken,
            expiresAt: DateTime.local().plus({
                minutes: 15,
            }),

            isRevoked: true,
        });

        const requestBody: ResetPasswordRequestBody = {
            token: plainToken,
            email: user.email,
            password: internet.password(),
            authenticationMode: 'web',
        };
        const response = await request
            .post('/authentication/reset-password')
            .send(requestBody)
            .expect(400);
        const parsedResponseBody = ResetPasswordResponseBody.parse(
            response.body,
        );

        assert.deepStrictEqual(parsedResponseBody, {
            status: 'INVALID_TOKEN',
        });
    });
});
