import Database from '@ioc:Adonis/Lucid/Database';
import {
    FollowUserRequestBody,
    FollowUserResponseBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UserProfileInformation,
    UserSettingVisibility,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    getVisibilityDatabaseEntry,
    TEST_USER_ROUTES_GROUP_PREFIX,
} from './utils/TestUtils';

test.group('Users Profile information tests', (group) => {
    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('It should follow given user', async (assert) => {
        const followedUserID = datatype.uuid();
        const followingUserID = datatype.uuid();
        const followingUser = await User.create({
            uuid: followingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const followedUser = await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const { body: rawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as FollowUserRequestBody)
            .expect(200);

        const parsedBody = FollowUserResponseBody.parse(rawBody);

        const expectedUserProfileInformation: UserProfileInformation = {
            following: true,
            userID: followedUserID,
            userNickname: followedUser.nickname,
            followersCounter: 1,
            followingCounter: 0,
            playlistsCounter: 0,
        };
        assert.deepEqual(
            parsedBody.userProfileInformation,
            expectedUserProfileInformation,
        );

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
    });

    test('It should return followed user not found', async () => {
        const followedUserID = datatype.uuid();
        const followingUserID = datatype.uuid();
        await User.create({
            uuid: followingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as FollowUserRequestBody)
            .expect(404);
    });

    //This will be should removed after authentication implem
    test('It should return following user not found', async () => {
        const followedUserID = datatype.uuid();
        const followingUserID = datatype.uuid();
        await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as FollowUserRequestBody)
            .expect(404);
    });

    test('It should return forbideen as following and followed user are the same', async () => {
        const followedUserID = datatype.uuid();
        await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send({
                tmpAuthUserID: followedUserID,
                userID: followedUserID,
            } as FollowUserRequestBody)
            .expect(403);
    });

    test('It should follow given user, on second try nothing should throw an error', async (assert) => {
        const followedUserID = datatype.uuid();
        const followingUserID = datatype.uuid();
        const followingUser = await User.create({
            uuid: followingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const followedUser = await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const { body: rawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as FollowUserRequestBody)
            .expect(200);

        const parsedBody = FollowUserResponseBody.parse(rawBody);

        const expectedUserProfileInformation: UserProfileInformation = {
            following: true,
            userID: followedUserID,
            userNickname: followedUser.nickname,
            followersCounter: 1,
            followingCounter: 0,
            playlistsCounter: 0,
        };
        assert.deepEqual(
            parsedBody.userProfileInformation,
            expectedUserProfileInformation,
        );

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

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as FollowUserRequestBody)
            .expect(500);
    });

    test('It should retrieve given user public profile information, then follow and inside follow retrieve follower only related user profile information', async (assert) => {
        const followedUserID = datatype.uuid();
        const followingUserID = datatype.uuid();
        const followingUser = await User.create({
            uuid: followingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const followedUser = await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const followerOnlyVisibility = await getVisibilityDatabaseEntry(
            UserSettingVisibility.Values.FOLLOWERS_ONLY,
        );
        await followedUser
            .related('playlistsVisibilitySetting')
            .associate(followerOnlyVisibility);
        await followedUser
            .related('relationsVisibilitySetting')
            .associate(followerOnlyVisibility);

        //GetUserProfileInformation
        const { body: getUserProfileInformationRawBody } = await supertest(
            BASE_URL,
        )
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as GetUserProfileInformationRequestBody)
            .expect(200);

        const getUserProfileInformationParsedBody =
            GetUserProfileInformationResponseBody.parse(
                getUserProfileInformationRawBody,
            );
        const expectedGetUserProfileInformationResponseBody: GetUserProfileInformationResponseBody =
            {
                following: false,
                userID: followedUserID,
                userNickname: followedUser.nickname,
            };
        assert.deepEqual(
            getUserProfileInformationParsedBody,
            expectedGetUserProfileInformationResponseBody,
        );

        //follow
        const { body: followRawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as FollowUserRequestBody)
            .expect(200);

        const followParsedBody = FollowUserResponseBody.parse(followRawBody);
        const expectedUserProfileInformation: UserProfileInformation = {
            following: true,
            userID: followedUserID,
            userNickname: followedUser.nickname,
            followersCounter: 1,
            followingCounter: 0,
            playlistsCounter: 0,
        };
        assert.deepEqual(
            followParsedBody.userProfileInformation,
            expectedUserProfileInformation,
        );

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
    });
});
