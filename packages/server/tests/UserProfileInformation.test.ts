import Database from '@ioc:Adonis/Lucid/Database';
import {
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
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

test.group('Users Profile information', (group) => {
    const { createRequest, createUserAndAuthenticate } = initTestUtils();

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('It should retrieve all user profile information, as every visibilities are public', async (assert) => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const body: GetUserProfileInformationRequestBody = {
            userID: searchedUserID,
        };
        const { body: rawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(body)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isFalse(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
        assert.equal(parsedBody.followersCounter, 0);
        assert.equal(parsedBody.followingCounter, 0);
        assert.equal(parsedBody.playlistsCounter, 0);
    });

    test('It should retrieve followed user profile information', async (assert) => {
        const request = createRequest();

        const searchingUser = await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        await searchedUser.related('followers').save(searchingUser);

        const body: GetUserProfileInformationRequestBody = {
            userID: searchedUserID,
        };
        const { body: rawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(body)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isTrue(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
    });

    test("Requires authentication to get another user's information", async () => {
        const request = createRequest();

        const searchedUser = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const body: GetUserProfileInformationRequestBody = {
            userID: searchedUser.uuid,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(body)
            .expect(401);
    });

    test('Returns an error when searched user does not exist', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const body: GetUserProfileInformationRequestBody = {
            userID: datatype.uuid(),
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(body)
            .expect(404);
    });

    test('Can not get its own information', async () => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);

        const body: GetUserProfileInformationRequestBody = {
            userID: user.uuid,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(body)
            .expect(403);
    });

    test('It should return only playlist information as relations visibility is private', async (assert) => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const privateVisibility = await getVisibilityDatabaseEntry('PRIVATE');
        await searchedUser
            .related('relationsVisibilitySetting')
            .associate(privateVisibility);

        const body: GetUserProfileInformationRequestBody = {
            userID: searchedUserID,
        };
        const { body: rawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(body)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isFalse(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
        assert.isUndefined(parsedBody.followersCounter);
        assert.isUndefined(parsedBody.followingCounter);
        assert.equal(parsedBody.playlistsCounter, 0);
    });

    test('It should return only relations information as playlist visibility is private', async (assert) => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const privateVisibility = await getVisibilityDatabaseEntry('PRIVATE');
        await searchedUser
            .related('playlistsVisibilitySetting')
            .associate(privateVisibility);

        const body: GetUserProfileInformationRequestBody = {
            userID: searchedUserID,
        };
        const { body: rawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(body)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isFalse(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
        assert.equal(parsedBody.followersCounter, 0);
        assert.equal(parsedBody.followingCounter, 0);
        assert.isUndefined(parsedBody.playlistsCounter);
    });

    test("It should not return either playlist nor relations information as they're followers only", async (assert) => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const followerOnlyVisibility = await getVisibilityDatabaseEntry(
            UserSettingVisibility.Values.FOLLOWERS_ONLY,
        );
        await searchedUser
            .related('playlistsVisibilitySetting')
            .associate(followerOnlyVisibility);
        await searchedUser
            .related('relationsVisibilitySetting')
            .associate(followerOnlyVisibility);

        const body: GetUserProfileInformationRequestBody = {
            userID: searchedUserID,
        };
        const { body: rawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(body)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isFalse(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
        assert.isUndefined(parsedBody.followingCounter);
        assert.isUndefined(parsedBody.followersCounter);
        assert.isUndefined(parsedBody.playlistsCounter);
    });

    test("It should return playlist and relations information as they're followers only", async (assert) => {
        const request = createRequest();

        const searchingUser = await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const followerOnlyVisibility = await getVisibilityDatabaseEntry(
            UserSettingVisibility.Values.FOLLOWERS_ONLY,
        );
        await searchedUser.related('followers').save(searchingUser);
        await searchedUser
            .related('playlistsVisibilitySetting')
            .associate(followerOnlyVisibility);
        await searchedUser
            .related('relationsVisibilitySetting')
            .associate(followerOnlyVisibility);

        const body: GetUserProfileInformationRequestBody = {
            userID: searchedUserID,
        };
        const { body: rawBody } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send(body)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isTrue(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
        assert.equal(parsedBody.followersCounter, 1);
        assert.equal(parsedBody.followingCounter, 0);
        assert.equal(parsedBody.playlistsCounter, 0);
    });
});
