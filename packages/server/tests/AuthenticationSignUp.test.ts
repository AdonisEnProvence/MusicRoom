import Database from '@ioc:Adonis/Lucid/Database';
import { SignUpResponseBody } from '@musicroom/types';
import User from 'App/Models/User';
import test from 'japa';
import supertest from 'supertest';
import urlcat from 'urlcat';
import { BASE_URL, TEST_AUTHENTICATION_GROUP_PREFIX } from './utils/TestUtils';

test.group('Users Profile information tests', (group) => {
    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('It should unfollow given user', async (assert) => {
        const { body: rawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send()
            .expect(200);

        const { userID, userNickname } = SignUpResponseBody.parse(rawBody);

        assert.isDefined(userID);
        assert.isDefined(userNickname);
        const createdUser = await User.findByOrFail('nickname', userNickname);
        assert.equal(createdUser.uuid, userID);
    });
});
