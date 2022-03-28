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

    test('It should failed to follow user as the requesting user has not confirmed his email', async () => {
        const request = createRequest();

        const emailNotConfirmed = true;
        await createUserAndAuthenticate(request, emailNotConfirmed);

        const followedUserID = datatype.uuid();
        await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const requestBody: FollowUserRequestBody = {
            userID: followedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send(requestBody)
            .expect(403);
    });

    test('It should follow given user', async (assert) => {
        const request = createRequest();

        const followingUser = await createUserAndAuthenticate(request);

        const followedUserID = datatype.uuid();
        const followedUser = await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const requestBody: FollowUserRequestBody = {
            userID: followedUserID,
        };
        const { body: rawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send(requestBody)
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
        await followingUser.load((loader) => {
            loader.load('following').load('followers');
        });
        assert.equal(followingUser.followers.length, 0);
        assert.equal(followingUser.following.length, 1);

        await followedUser.refresh();
        await followedUser.load((loader) => {
            loader.load('following').load('followers');
        });
        assert.equal(followedUser.followers.length, 1);
        assert.equal(followedUser.following.length, 0);
    });

    test('It should return followed user not found', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const requestBody: FollowUserRequestBody = {
            userID: datatype.uuid(),
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send(requestBody)
            .expect(404);
    });

    test('Returns an authentication error when current user is not authenticated', async () => {
        const request = createRequest();

        const followedUserID = datatype.uuid();
        await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const requestBody: FollowUserRequestBody = {
            userID: followedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send(requestBody)
            .expect(401);
    });

    test('It should return forbideen as following and followed user are the same', async () => {
        const request = createRequest();

        const followingUser = await createUserAndAuthenticate(request);

        const requestBody: FollowUserRequestBody = {
            userID: followingUser.uuid,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send(requestBody)
            .expect(403);
    });

    test('It should follow given user, on second try nothing should throw an error', async (assert) => {
        const request = createRequest();

        const followingUser = await createUserAndAuthenticate(request);

        const followedUserID = datatype.uuid();
        const followedUser = await User.create({
            uuid: followedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const requestBody: FollowUserRequestBody = {
            userID: followedUserID,
        };
        const { body: rawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send(requestBody)
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
        await followingUser.load((loader) => {
            loader.load('following').load('followers');
        });

        assert.equal(followingUser.followers.length, 0);
        assert.equal(followingUser.following.length, 1);

        await followedUser.refresh();
        await followedUser.load((loader) => {
            loader.load('following').load('followers');
        });

        assert.equal(followedUser.followers.length, 1);
        assert.equal(followedUser.following.length, 0);

        const secondRequestBody = {
            userID: followedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send(secondRequestBody)
            .expect(500);
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
                following: false,
                userID: followedUserID,
                userNickname: followedUser.nickname,
            };
        assert.deepEqual(
            getUserProfileInformationParsedBody,
            expectedGetUserProfileInformationResponseBody,
        );

        //follow
        const followRequestBody: FollowUserRequestBody = {
            userID: followedUserID,
        };
        const { body: followRawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'follow'))
            .send(followRequestBody)
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
        await followingUser.load((loader) => {
            loader.load('following').load('followers');
        });

        assert.equal(followingUser.followers.length, 0);
        assert.equal(followingUser.following.length, 1);

        await followedUser.refresh();
        await followedUser.load((loader) => {
            loader.load('following').load('followers');
        });

        assert.equal(followedUser.followers.length, 1);
        assert.equal(followedUser.following.length, 0);
    });
});
