import Database from '@ioc:Adonis/Lucid/Database';
import {
    GetMyProfileInformationRequestBody,
    GetMyProfileInformationResponseBody,
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
} from './utils/TestUtils';

test.group('Users Profile information tests', (group) => {
    const {
        createUserAndGetSocket,
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

    test('It should retrieve my profile information', async (assert) => {
        const userID = datatype.uuid();
        const userNickname = internet.userName();
        await createUserAndGetSocket({
            userNickname,
            userID,
        });
        await createSocketConnection({
            userID,
        });

        const { body: rawBody } = await supertest(BASE_URL)
            .post(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .send({
                tmpAuthUserID: userID,
            } as GetMyProfileInformationRequestBody)
            .expect(200);

        const parsedBody = GetMyProfileInformationResponseBody.parse(rawBody);
        const expectedBody: GetMyProfileInformationResponseBody = {
            devicesCounter: 2,
            followersCounter: 0,
            followingCounter: 0,
            playlistsCounter: 0,
            userID,
            userNickname,
        };
        assert.deepEqual(parsedBody, expectedBody);
    });

    test('It should send back user not found', async () => {
        const userID = datatype.uuid();

        await supertest(BASE_URL)
            .post(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .send({
                tmpAuthUserID: userID,
            } as GetMyProfileInformationRequestBody)
            .expect(404);
    });

    test('It should send back error as no user devices are up', async () => {
        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .send({
                tmpAuthUserID: userID,
            } as GetMyProfileInformationRequestBody)
            .expect(500);
    });
});
