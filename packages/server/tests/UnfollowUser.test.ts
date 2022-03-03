import Database from '@ioc:Adonis/Lucid/Database';
import {
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
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

    test('It should unfollow given user', async (assert) => {
        const unfollowedUserID = datatype.uuid();
        const unfollowingUserID = datatype.uuid();
        const unfollowingUser = await User.create({
            uuid: unfollowingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const unfollowedUser = await User.create({
            uuid: unfollowedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        await unfollowedUser.related('followers').save(unfollowingUser);

        const { body: unfollowRawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send({
                tmpAuthUserID: unfollowingUserID,
                userID: unfollowedUserID,
            } as UnfollowUserRequestBody)
            .expect(200);

        const unfollowParsedBody =
            UnfollowUserResponseBody.parse(unfollowRawBody);
        const expectedUnfollowParsedBody: UserProfileInformation = {
            following: false,
            userID: unfollowedUserID,
            userNickname: unfollowedUser.nickname,
            followersCounter: 0,
            followingCounter: 0,
            playlistsCounter: 0,
        };
        assert.deepEqual(
            unfollowParsedBody.userProfileInformation,
            expectedUnfollowParsedBody,
        );
        await unfollowingUser.refresh();
        await unfollowingUser.load('following');
        await unfollowingUser.load('followers');
        await unfollowedUser.refresh();
        await unfollowedUser.load('following');
        await unfollowedUser.load('followers');

        assert.equal(unfollowingUser.followers.length, 0);
        assert.equal(unfollowingUser.following.length, 0);
        assert.equal(unfollowedUser.followers.length, 0);
        assert.equal(unfollowedUser.following.length, 0);
    });

    test('It should return followed user not found', async () => {
        const unfollowedUserID = datatype.uuid();
        const unfollowingUserID = datatype.uuid();
        await User.create({
            uuid: unfollowingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
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
            email: internet.email(),
            password: internet.password(),
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
            email: internet.email(),
            password: internet.password(),
        });
        await User.create({
            uuid: unfollowedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send({
                tmpAuthUserID: unfollowingUserID,
                userID: unfollowedUserID,
            } as UnfollowUserRequestBody)
            .expect(500);
    });

    test('It should return forbideen as following and followed user are the same', async () => {
        const unfollowingUserID = datatype.uuid();
        await User.create({
            uuid: unfollowingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send({
                tmpAuthUserID: unfollowingUserID,
                userID: unfollowingUserID,
            } as UnfollowUserRequestBody)
            .expect(403);
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
        await followingUser.related('following').save(followedUser);

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
                following: true,
                userID: followedUserID,
                userNickname: followedUser.nickname,
                followersCounter: 1,
                followingCounter: 0,
                playlistsCounter: 0,
            };
        assert.deepEqual(
            getUserProfileInformationParsedBody,
            expectedGetUserProfileInformationResponseBody,
        );

        //unfollow
        const { body: unfollowRawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send({
                tmpAuthUserID: followingUserID,
                userID: followedUserID,
            } as UnfollowUserRequestBody)
            .expect(200);

        const unfollowParsedBody =
            UnfollowUserResponseBody.parse(unfollowRawBody);
        const expectedUserProfileInformation: UserProfileInformation = {
            following: false,
            userID: followedUserID,
            userNickname: followedUser.nickname,
        };
        assert.deepEqual(
            unfollowParsedBody.userProfileInformation,
            expectedUserProfileInformation,
        );

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
});
