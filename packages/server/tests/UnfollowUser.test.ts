import Database from '@ioc:Adonis/Lucid/Database';
import {
    FollowUserRequestBody,
    FollowUserResponseBody,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import urlcat from 'urlcat';
import { BASE_URL, TEST_USER_ROUTES_GROUP_PREFIX } from './utils/TestUtils';

test.group('Users Profile information tests', (group) => {
    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('It should unfollow given user', async (assert) => {
        const followedUserID = datatype.uuid();
        const followingUserID = datatype.uuid();
        const followingUser = await User.create({
            uuid: followingUserID,
            nickname: internet.userName(),
        });
        const followedUser = await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
        });

        const { body: rawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as FollowUserRequestBody)
            .expect(200);

        const parsedBody = FollowUserResponseBody.parse(rawBody);

        assert.equal(parsedBody.status, 'SUCCESS');

        await followingUser.refresh();
        await followingUser.load('following');
        await followingUser.load('followers');
        await followedUser.refresh();
        await followedUser.load('following');
        await followedUser.load('followers');

        assert.equal(followingUser.followers.length, 0);
        assert.equal(followingUser.following.length, 1);
        assert.equal(followedUser.followers.length, 1);
        assert.equal(followedUser.following.length, 0);

        const { body: unfollowRawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as UnfollowUserRequestBody)
            .expect(200);

        const unfollowParsedBody =
            UnfollowUserResponseBody.parse(unfollowRawBody);

        assert.equal(unfollowParsedBody.status, 'SUCCESS');
        await followingUser.refresh();
        await followingUser.load('following');
        await followingUser.load('followers');
        await followedUser.refresh();
        await followedUser.load('following');
        await followedUser.load('followers');

        assert.equal(followingUser.followers.length, 0);
        assert.equal(followingUser.following.length, 0);
        assert.equal(followedUser.followers.length, 0);
        assert.equal(followedUser.following.length, 0);
    });

    test('It should return followed user not found', async () => {
        const unfollowedUserID = datatype.uuid();
        const unfollowingUserID = datatype.uuid();
        await User.create({
            uuid: unfollowingUserID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send({
                tmpAuthUserID: unfollowingUserID,
                userID: unfollowedUserID,
            } as UnfollowUserRequestBody)
            .expect(404);
    });

    //This will be should removed after authentication implem
    test('It should return following user not found', async () => {
        const unfollowedUserID = datatype.uuid();
        const unfollowingUserID = datatype.uuid();
        await User.create({
            uuid: unfollowedUserID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send({
                tmpAuthUserID: unfollowingUserID,
                userID: unfollowedUserID,
            } as UnfollowUserRequestBody)
            .expect(404);
    });

    test('It should throw an error as unfollowing user does not follow given user', async () => {
        const unfollowedUserID = datatype.uuid();
        const unfollowingUserID = datatype.uuid();
        await User.create({
            uuid: unfollowingUserID,
            nickname: internet.userName(),
        });
        await User.create({
            uuid: unfollowedUserID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send({
                tmpAuthUserID: unfollowingUserID,
                userID: unfollowedUserID,
            } as UnfollowUserRequestBody)
            .expect(500);
    });
});
