import Database from '@ioc:Adonis/Lucid/Database';
import {
    ApiTokensSuccessfullSignUpResponseBody,
    SignUpFailureResponseBody,
    SignUpRequestBody,
    WebAuthSuccessfullSignUpResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet, random } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    generateStrongPassword,
    generateWeakPassword,
    TEST_AUTHENTICATION_GROUP_PREFIX,
} from './utils/TestUtils';

test.group('Authentication sign up tests group', (group) => {
    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('It should sign up user with web auth using given credentials', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'web',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(200);

        const {
            status,
            userSummary: { nickname, userID },
        } = WebAuthSuccessfullSignUpResponseBody.parse(rawBody);
        assert.equal(status, 'SUCCESS');
        assert.isDefined(userID);
        assert.equal(nickname, userNickname);

        const getMeResponseBody = await request
            .get('/authentication/me')
            .expect(200)
            .expect('Content-Type', /json/);

        assert.equal(getMeResponseBody.body.user.nickname, userNickname);
        assert.equal(getMeResponseBody.body.user.email, email);
        assert.isUndefined(getMeResponseBody.body.user.password);
    });

    test('It should sign up user with web auth using given credentials', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(200);

        const {
            status,
            token,
            userSummary: { nickname, userID },
        } = ApiTokensSuccessfullSignUpResponseBody.parse(rawBody);
        assert.equal(status, 'SUCCESS');
        assert.isDefined(token);
        assert.isDefined(userID);
        assert.equal(nickname, userNickname);

        const getMeResponseBody = await request
            .get('/authentication/me')
            .set('Authorization', `bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /json/);

        assert.equal(getMeResponseBody.body.user.nickname, userNickname);
        assert.equal(getMeResponseBody.body.user.email, email);
        assert.isUndefined(getMeResponseBody.body.user.password);
    });

    test('It should fail to sign up as given password is weak', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateWeakPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'WEAK_PASSWORD');
    });

    test('It should fail to sign up as given email is invalid', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email().replace('@', random.word());
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'INVALID_EMAIL');
    });

    test('It should fail to sign up as given email is too long', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = `${'email'.repeat(100)}${internet.email()}`;
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'INVALID_EMAIL');
    });

    test('It should send back 500 error as payload is partially empty', async () => {
        const request = supertest.agent(BASE_URL);
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email: undefined,
                password,
                userNickname,
            })
            .expect(500);
    });

    test('It should fail to sign up as given username is taken', async (assert) => {
        const userNickname = internet.userName();

        await supertest(BASE_URL)
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'web',
                email: internet.email(),
                password: generateStrongPassword(),
                userNickname,
            } as SignUpRequestBody)
            .expect(200);

        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'UNAVAILABLE_NICKNAME');
    });

    test('It should fail to sign up as user with given email is already in base', async (assert) => {
        const email = internet.email();

        await supertest(BASE_URL)
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'web',
                email,
                password: generateStrongPassword(),
                userNickname: internet.userName(),
            } as SignUpRequestBody)
            .expect(200);

        const request = supertest.agent(BASE_URL);
        const password = internet.password();
        const userNickname = internet.userName();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'UNAVAILABLE_EMAIL');
    });

    test('It should fail to sign up raising every possibles errors', async (assert) => {
        const email = internet.email().replace('@', random.word());
        const userNickname = internet.userName();

        // Indeed we're saving a bad formatted email directly in database
        // To cover corresponding exception for the following sign up
        await User.create({
            email,
            nickname: userNickname,
            password: 'nevermind',
            uuid: datatype.uuid(),
        });

        const request = supertest.agent(BASE_URL);
        const password = generateWeakPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.equal(signUpFailureReasonCollection.length, 4);

        assert.deepEqual(signUpFailureReasonCollection, [
            'INVALID_EMAIL',
            'UNAVAILABLE_NICKNAME',
            'UNAVAILABLE_EMAIL',
            'WEAK_PASSWORD',
        ]);
    });
});
