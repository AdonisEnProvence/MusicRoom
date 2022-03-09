import Database from '@ioc:Adonis/Lucid/Database';
import {
    GetMyProfileInformationResponseBody,
    SignInRequestBody,
    SignInSuccessfulWebAuthResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    initTestUtils,
    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
} from '../../../tests/utils/TestUtils';

async function createUserAndAuthenticate(
    request: supertest.SuperAgentTest,
): Promise<User> {
    const userID = datatype.uuid();
    const userUnhashedPassword = internet.password();
    const user = await User.create({
        uuid: userID,
        nickname: internet.userName(),
        email: internet.email(),
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
    SignInSuccessfulWebAuthResponseBody.parse(signInResponse.body);

    return user;
}

test.group('MyProfileController', (group) => {
    const {
        createSocketConnection,
        initSocketConnection,
        disconnectEveryRemainingSocketConnection,
    } = initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        sinon.restore();
        await Database.rollbackGlobalTransaction();
    });

    test('Retrieves profile information of the current authenticated user', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const user = await createUserAndAuthenticate(request);
        await createSocketConnection({
            userID: user.uuid,
        });
        await createSocketConnection({
            userID: user.uuid,
        });

        const { body: rawBody } = await request
            .get(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .expect(200);

        const parsedBody = GetMyProfileInformationResponseBody.parse(rawBody);
        const expectedBody: GetMyProfileInformationResponseBody = {
            devicesCounter: 2,
            followersCounter: 0,
            followingCounter: 0,
            playlistsCounter: 0,
            userID: user.uuid,
            userNickname: user.nickname,
        };
        assert.deepEqual(parsedBody, expectedBody);
    });

    test('Returns a 401 error when the current user is unauthenticated', async () => {
        const request = supertest.agent(BASE_URL);

        await request
            .get(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .expect(401);
    });

    test('Sends back a 500 error as current user has no active device', async () => {
        const request = supertest.agent(BASE_URL);

        await createUserAndAuthenticate(request);

        await request
            .get(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .expect(500);
    });
});
