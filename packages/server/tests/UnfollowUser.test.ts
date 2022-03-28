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
import urlcat from 'urlcat';
import {
    getVisibilityDatabaseEntry,
    initTestUtils,
    TEST_USER_ROUTES_GROUP_PREFIX,
} from './utils/TestUtils';

test.group('Users Profile information tests', (group) => {
    const { createRequest, createUserAndAuthenticate } = initTestUtils();

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('It should failed to unfollow user as the requesting user has not confirmed his email', async () => {
        const request = createRequest();

        const emailNotConfirmed = true;
        const unfollowingUser = await createUserAndAuthenticate(
            request,
            emailNotConfirmed,
        );

        const unfollowedUserID = datatype.uuid();
        const unfollowedUser = await User.create({
            uuid: unfollowedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        await unfollowedUser.related('followers').save(unfollowingUser);

        const unfollowRequestBody: UnfollowUserRequestBody = {
            userID: unfollowedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send(unfollowRequestBody)
            .expect(403);
    });

    test('It should unfollow given user', async (assert) => {
        const request = createRequest();

        const unfollowingUser = await createUserAndAuthenticate(request);

        const unfollowedUserID = datatype.uuid();
        const unfollowedUser = await User.create({
            uuid: unfollowedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        await unfollowedUser.related('followers').save(unfollowingUser);

        const unfollowRequestBody: UnfollowUserRequestBody = {
            userID: unfollowedUserID,
        };
        const { body: unfollowRawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send(unfollowRequestBody)
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
        await unfollowingUser.load((loader) => {
            loader.load('following').load('followers');
        });

        assert.equal(unfollowingUser.followers.length, 0);
        assert.equal(unfollowingUser.following.length, 0);

        await unfollowedUser.refresh();
        await unfollowedUser.load((loader) => {
            loader.load('following').load('followers');
        });

        assert.equal(unfollowedUser.followers.length, 0);
        assert.equal(unfollowedUser.following.length, 0);
    });

    test('It should return followed user not found', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const unfollowRequestBody: UnfollowUserRequestBody = {
            userID: datatype.uuid(),
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send(unfollowRequestBody)
            .expect(404);
    });

    test('Returns an authentication error when current user is not authenticated and wants to unfollow another user', async () => {
        const request = createRequest();

        const unfollowedUserID = datatype.uuid();
        await User.create({
            uuid: unfollowedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const unfollowRequestBody: UnfollowUserRequestBody = {
            userID: unfollowedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send(unfollowRequestBody)
            .expect(401);
    });

    test('It should throw an error as unfollowing user does not follow given user', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const unfollowedUserID = datatype.uuid();
        await User.create({
            uuid: unfollowedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const unfollowRequestBody: UnfollowUserRequestBody = {
            userID: unfollowedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send(unfollowRequestBody)
            .expect(500);
    });

    test('It should return forbideen as following and followed user are the same', async () => {
        const request = createRequest();

        const unfollowingUser = await createUserAndAuthenticate(request);

        const unfollowRequestBody: UnfollowUserRequestBody = {
            userID: unfollowingUser.uuid,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send(unfollowRequestBody)
            .expect(403);
    });

    test('It should retrieve given user public profile information, then follow and inside follow retrieve follower only related user profile information', async (assert) => {
        const request = createRequest();

        const followingUser = await createUserAndAuthenticate(request);

        const followedUserID = datatype.uuid();
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

        const getUserProfileInformationRequestBody: GetUserProfileInformationRequestBody =
            {
                userID: followedUserID,
            };
        const { body: getUserProfileInformationRawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(getUserProfileInformationRequestBody)
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

        const unfollowRequestBody: UnfollowUserRequestBody = {
            userID: followedUserID,
        };
        const { body: unfollowRawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'unfollow'))
            .send(unfollowRequestBody)
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
        await followingUser.load((loader) => {
            loader.load('following').load('followers');
        });

        assert.equal(followingUser.followers.length, 0);
        assert.equal(followingUser.following.length, 0);

        await followedUser.refresh();
        await followedUser.load((loader) => {
            loader.load('following').load('followers');
        });

        assert.equal(followedUser.followers.length, 0);
        assert.equal(followedUser.following.length, 0);
    });
});
