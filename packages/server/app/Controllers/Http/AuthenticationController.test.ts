import Database from '@ioc:Adonis/Lucid/Database';
import {
    SignInFailureResponseBody,
    SignInRequestBody,
    SignInSuccessfulApiTokensResponseBody,
    SignInSuccessfulWebAuthResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import test from 'japa';
import supertest from 'supertest';
import { BASE_URL } from '../../../tests/utils/TestUtils';

test.group('AuthenticationController', (group) => {
    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
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

        const getMeResponseBody = await request
            .get('/authentication/me')
            .expect(200)
            .expect('Content-Type', /json/);

        assert.equal(getMeResponseBody.body.user.nickname, user.nickname);
        assert.equal(getMeResponseBody.body.user.email, user.email);
        assert.equal(getMeResponseBody.body.user.uuid, user.uuid);
        assert.isUndefined(getMeResponseBody.body.user.password);
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

        const getMeResponseBody = await request
            .get('/authentication/me')
            .set('Authorization', `bearer ${authToken}`)
            .expect(200)
            .expect('Content-Type', /json/);

        assert.equal(getMeResponseBody.body.user.nickname, user.nickname);
        assert.equal(getMeResponseBody.body.user.email, user.email);
        assert.equal(getMeResponseBody.body.user.uuid, user.uuid);
        assert.isUndefined(getMeResponseBody.body.user.password);
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
});
