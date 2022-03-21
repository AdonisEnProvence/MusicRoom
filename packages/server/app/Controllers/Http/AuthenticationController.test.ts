import Database from '@ioc:Adonis/Lucid/Database';
import {
    ConfirmEmailRequestBody,
    ConfirmEmailResponseBody,
    GetMyProfileInformationResponseBody,
    SignInFailureResponseBody,
    SignInRequestBody,
    SignInSuccessfulApiTokensResponseBody,
    SignInSuccessfulWebAuthResponseBody,
    SignOutResponseBody,
} from '@musicroom/types';
import { DateTime } from 'luxon';
import User from 'App/Models/User';
import { internet } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import {
    BASE_URL,
    generateStrongPassword,
    initTestUtils,
} from '../../../tests/utils/TestUtils';

test.group('AuthenticationController', (group) => {
    const { initSocketConnection, disconnectEveryRemainingSocketConnection } =
        initTestUtils();

    group.beforeEach(async () => {
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

        const user = await createUserAndAuthenticate(request);

        const requestBody: ConfirmEmailRequestBody = {
            token: '123456',
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

    test("Does not confirm user's email when confirmation code is invalid", async (assert) => {
        const request = supertest.agent(BASE_URL);

        const user = await createUserAndAuthenticate(request);
        const INVALID_CONFIRMATION_CODE = 'adgfhjadfg';

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
});
