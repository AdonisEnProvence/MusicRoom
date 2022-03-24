import Database from '@ioc:Adonis/Lucid/Database';
import {
    SignInRequestBody,
    SignInSuccessfulWebAuthResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import test from 'japa';
import supertest from 'supertest';
import { BASE_URL, initTestUtils } from '../../../tests/utils/TestUtils';

test.group('TestEnvMethodController tests group', (group) => {
    const { initSocketConnection, disconnectEveryRemainingSocketConnection } =
        initTestUtils();

    const nodeEnvIsNotDevelopment = process.env.NODE_ENV !== 'development';
    if (nodeEnvIsNotDevelopment) {
        console.log('Ignoring TestEnvMethodController tests group');
        return;
    }

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        await Database.rollbackGlobalTransaction();
    });

    //Is it possible to change env variable in japa ? if yes should be able to that route doesn't exist env !== dev
    // test('It should not be able to hit bypass email verification route in other node_env than development', async (assert) => {

    test('It should bypass authenticated user email verification', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const userUnhashedPassword = "Popol l'est gentil";
        const user = await User.create({
            nickname: 'Popol',
            email: 'gentil-popol@gmail.com',
            password: userUnhashedPassword,
        });
        assert.isUndefined(user.confirmedEmailAt);

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

        await request.get('/test/bypass-email-confirmation').expect(200);

        await user.refresh();
        assert.isDefined(user.confirmedEmailAt);
    });

    test('It should fail to bypass unauthenticated user email verification', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const userUnhashedPassword = "Popol l'est gentil";
        const user = await User.create({
            nickname: 'Popol',
            email: 'gentil-popol@gmail.com',
            password: userUnhashedPassword,
        });
        assert.isUndefined(user.confirmedEmailAt);

        await request.get('/test/bypass-email-confirmation').expect(401);
    });
});
