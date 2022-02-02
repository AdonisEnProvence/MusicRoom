import Database from '@ioc:Adonis/Lucid/Database';
import {
    GetMyProfileInformationRequestBody,
    GetMyProfileInformationResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import urlcat from 'urlcat';
import { USER_ROUTES_GROUP_PREFIX } from '../start/routes';
import { BASE_URL, initTestUtils } from './utils/TestUtils';

test.group('Users Profile information tests', (group) => {
    const { createUserAndGetSocket, createSocketConnection } = initTestUtils();

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
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
            .post(urlcat(USER_ROUTES_GROUP_PREFIX, 'my-profile-information'))
            .send({
                tmpAuthUserID: userID,
            } as GetMyProfileInformationRequestBody)
            .expect(200);

        const parsedBody = GetMyProfileInformationResponseBody.parse(rawBody);

        assert.equal(parsedBody.devicesCounter, 2);
        assert.equal(parsedBody.userID, userID);
        assert.equal(parsedBody.userNickname, userNickname);
    });

    test('It should send back user not found', async () => {
        const userID = datatype.uuid();

        await supertest(BASE_URL)
            .post(urlcat(USER_ROUTES_GROUP_PREFIX, 'my-profile-information'))
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
            .post(urlcat(USER_ROUTES_GROUP_PREFIX, 'my-profile-information'))
            .send({
                tmpAuthUserID: userID,
            } as GetMyProfileInformationRequestBody)
            .expect(500);
    });
});
