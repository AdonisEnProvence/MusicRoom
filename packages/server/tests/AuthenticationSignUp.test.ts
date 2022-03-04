import Database from '@ioc:Adonis/Lucid/Database';
import {
    SignUpRequestBody,
    SignUpResponseBody,
    SignUpSuccessfullResponseBody,
} from '@musicroom/types';
import { internet, random } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    generateStrongPassword,
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
            token,
            userSummary: { nickname, userID },
        } = SignUpSuccessfullResponseBody.parse(rawBody);
        assert.equal(status, 'SUCCESS');
        assert.isUndefined(token);
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
        } = SignUpSuccessfullResponseBody.parse(rawBody);
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
        const password = internet.password();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status } = SignUpResponseBody.parse(rawBody);
        assert.equal(status, 'WEAK_PASSWORD');
    });

    test('It should fail to sign up as given email is invalid', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email().replace('@', random.word());
        const userNickname = internet.userName();
        const password = internet.password();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status } = SignUpResponseBody.parse(rawBody);
        assert.equal(status, 'INVALID_EMAIL');
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
        const password = internet.password();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status } = SignUpResponseBody.parse(rawBody);
        assert.equal(status, 'UNAVAILABLE_NICKNAME');
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

        const { status } = SignUpResponseBody.parse(rawBody);
        assert.equal(status, 'UNAVAILABLE_EMAIL');
    });
});
