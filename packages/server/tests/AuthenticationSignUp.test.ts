import Database from '@ioc:Adonis/Lucid/Database';
import { SignUpRequestBody, SignUpResponseBody } from '@musicroom/types';
import { internet } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import urlcat from 'urlcat';
import { BASE_URL, TEST_AUTHENTICATION_GROUP_PREFIX } from './utils/TestUtils';

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
        const password = internet.password();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'web',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(200);

        const { status, token } = SignUpResponseBody.parse(rawBody);
        assert.isTrue(status === 'SUCCESS');
        assert.isUndefined(token);

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
        const password = internet.password();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(200);

        const { status, token } = SignUpResponseBody.parse(rawBody);
        assert.isTrue(status === 'SUCCESS');
        assert.isDefined(token);

        const getMeResponseBody = await request
            .get('/authentication/me')
            .set('Authorization', `bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /json/);

        assert.equal(getMeResponseBody.body.user.nickname, userNickname);
        assert.equal(getMeResponseBody.body.user.email, email);
        assert.isUndefined(getMeResponseBody.body.user.password);
    });
});
