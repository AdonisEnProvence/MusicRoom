import Database from '@ioc:Adonis/Lucid/Database';
import {
    ConfirmEmailRequestBody,
    ConfirmEmailResponseBody,
    GetMyProfileInformationResponseBody,
    ResendConfirmationEmailResponseBody,
    SignInFailureResponseBody,
    SignInRequestBody,
    SignInSuccessfulApiTokensResponseBody,
    SignInSuccessfulWebAuthResponseBody,
    SignOutResponseBody,
    TokenTypeName,
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
import { customAlphabet } from 'nanoid/non-secure';
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
        const nanoid = customAlphabet('0123456789', 6);

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
                    value: nanoid(),
                    expiresAt: DateTime.local().minus({
                        minutes: datatype.number({
                            min: 1,
                            max: 59,
                        }),
                    }),
                }),
            }),
        );

        const mailTrapEmailVerificationSpy = spy<
            (message: MessageNode) => void
        >((message) => {
            assert.deepEqual(message.to, [
                {
                    address: user.email,
                },
            ]);

            assert.deepEqual(message.from, {
                address: 'no-reply@adonisenprovence.com',
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
            const tokenValue = tokenElement.text();
            assert.match(tokenValue, /\d{6}/);
        });
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

        const token = await waitFor(() => {
            assert.isTrue(mailTrapEmailVerificationSpy.calledOnce);

            const message = mailTrapEmailVerificationSpy.lastCall.args[0];
            const html = message.html;
            invariant(
                html !== undefined,
                'HTML content of the email must be defined',
            );

            const $ = cheerio.load(html);
            const tokenElement = $('[data-testid="token"]');
            const tokenValue = tokenElement.text();

            return tokenValue;
        });

        const requestBody: ConfirmEmailRequestBody = {
            token,
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
        const nanoid = customAlphabet('0123456789', 6);

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
                    value: nanoid(),
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
