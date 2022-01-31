import Database from '@ioc:Adonis/Lucid/Database';
import {
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import { BASE_URL } from './utils/TestUtils';

test.group('Users Profile information tests', (group) => {
    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('It should retrieve user profile information', async (assert) => {
        const userID = datatype.uuid();
        const searchedUserID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
        });

        const { body: rawBody } = await supertest(BASE_URL)
            .post('/user/profile-information')
            .send({
                tmpAuthUserID: userID,
                userID: searchedUserID,
            } as GetUserProfileInformationRequestBody)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isFalse(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
    });

    test.failing(
        'It should retrieve followed user profile information',
        async (assert) => {
            const userID = datatype.uuid();
            const searchedUserID = datatype.uuid();
            await User.create({
                uuid: userID,
                nickname: internet.userName(),
            });
            const searchedUser = await User.create({
                uuid: searchedUserID,
                nickname: internet.userName(),
            });

            const { body: rawBody } = await supertest(BASE_URL)
                .post('/user/profile-information')
                .send({
                    tmpAuthUserID: userID,
                    userID: searchedUserID,
                } as GetUserProfileInformationRequestBody)
                .expect(200);

            const parsedBody =
                GetUserProfileInformationResponseBody.parse(rawBody);

            assert.isTrue(parsedBody.following);
            assert.equal(parsedBody.userID, searchedUser.uuid);
            assert.equal(parsedBody.userNickname, searchedUser.nickname);
        },
    );

    test('Requesting user not found', async () => {
        const userID = datatype.uuid();
        const searchedUserID = datatype.uuid();

        await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post('/user/profile-information')
            .send({
                tmpAuthUserID: userID,
                userID: searchedUserID,
            } as GetUserProfileInformationRequestBody)
            .expect(404);
    });

    test('Searched user not found', async () => {
        const userID = datatype.uuid();
        const searchedUserID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post('/user/profile-information')
            .send({
                tmpAuthUserID: userID,
                userID: searchedUserID,
            } as GetUserProfileInformationRequestBody)
            .expect(404);
    });
});
