import Database from '@ioc:Adonis/Lucid/Database';
import User from 'App/Models/User';
import test from 'japa';
import supertest from 'supertest';
import { BASE_URL } from '../../../tests/utils/TestUtils';
import { SignInRequestBody } from './AuthenticationController';

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
            authenticationMode: 'web-auth',
        };
        const response = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(200);

        const responseSetCookies = response.header['set-cookie'];
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
            authenticationMode: 'api-tokens',
        };
        const signInResponse = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(200);
        const authToken = signInResponse.body.token;
        assert.equal(authToken.type, 'bearer');
        assert.isString(authToken.token);

        console.log('sent token', `bearer ${authToken.token}`);

        const getMeResponseBody = await request
            .get('/authentication/me')
            .set('Authorization', `bearer ${authToken.token}`)
            .expect(200)
            .expect('Content-Type', /json/);

        assert.equal(getMeResponseBody.body.user.nickname, user.nickname);
        assert.equal(getMeResponseBody.body.user.email, user.email);
        assert.equal(getMeResponseBody.body.user.uuid, user.uuid);
        assert.isUndefined(getMeResponseBody.body.user.password);
    });
});
