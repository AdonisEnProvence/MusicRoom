import Database from '@ioc:Adonis/Lucid/Database';
import {
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import SettingVisibility from 'App/Models/SettingVisibility';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import urlcat from 'urlcat';
import { BASE_URL, TEST_USER_ROUTES_GROUP_PREFIX } from './utils/TestUtils';

async function getVisibilityDatabaseEntry(
    visibilityValue: UserSettingVisibility,
): Promise<SettingVisibility> {
    return await SettingVisibility.findByOrFail('name', visibilityValue);
}

test.group('Users Profile information tests', (group) => {
    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('It should retrieve all user profile information, as every visibilities are public', async (assert) => {
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
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send({
                tmpAuthUserID: userID,
                userID: searchedUserID,
            } as GetUserProfileInformationRequestBody)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isFalse(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
        assert.equal(parsedBody.followersCounter, 21);
        assert.equal(parsedBody.followingCounter, 42);
        assert.equal(parsedBody.playlistsCounter, 0);
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
                .post(
                    urlcat(
                        TEST_USER_ROUTES_GROUP_PREFIX,
                        'profile-information',
                    ),
                )
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
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
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
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send({
                tmpAuthUserID: userID,
                userID: searchedUserID,
            } as GetUserProfileInformationRequestBody)
            .expect(404);
    });

    test('Searched user is searching user', async () => {
        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send({
                tmpAuthUserID: userID,
                userID: userID,
            } as GetUserProfileInformationRequestBody)
            .expect(403);
    });

    test('It should return only playlist information as relations visibility is private', async (assert) => {
        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
        });
        const privateVisibility = await getVisibilityDatabaseEntry(
            UserSettingVisibility.Values.PRIVATE,
        );
        await searchedUser
            .related('relationsVisibilitySetting')
            .associate(privateVisibility);

        const { body: rawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send({
                tmpAuthUserID: userID,
                userID: searchedUserID,
            } as GetUserProfileInformationRequestBody)
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
        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
        });
        const privateVisibility = await getVisibilityDatabaseEntry(
            UserSettingVisibility.Values.PRIVATE,
        );
        await searchedUser
            .related('playlistsVisibilitySetting')
            .associate(privateVisibility);

        const { body: rawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send({
                tmpAuthUserID: userID,
                userID: searchedUserID,
            } as GetUserProfileInformationRequestBody)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isFalse(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
        assert.equal(parsedBody.followersCounter, 21);
        assert.equal(parsedBody.followingCounter, 42);
        assert.isUndefined(parsedBody.playlistsCounter);
    });

    test("It should not return either playlist nor relations information as they're followers only", async (assert) => {
        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
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

        const { body: rawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'profile-information'))
            .send({
                tmpAuthUserID: userID,
                userID: searchedUserID,
            } as GetUserProfileInformationRequestBody)
            .expect(200);

        const parsedBody = GetUserProfileInformationResponseBody.parse(rawBody);

        assert.isFalse(parsedBody.following);
        assert.equal(parsedBody.userID, searchedUser.uuid);
        assert.equal(parsedBody.userNickname, searchedUser.nickname);
        assert.isUndefined(parsedBody.followingCounter);
        assert.isUndefined(parsedBody.followersCounter);
        assert.isUndefined(parsedBody.playlistsCounter);
    });

    test.failing(
        "It should return playlist and relations information as they're followers only",
        async (assert) => {
            const userID = datatype.uuid();
            await User.create({
                uuid: userID,
                nickname: internet.userName(),
            });

            const searchedUserID = datatype.uuid();
            const searchedUser = await User.create({
                uuid: searchedUserID,
                nickname: internet.userName(),
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

            const { body: rawBody } = await supertest(BASE_URL)
                .post(
                    urlcat(
                        TEST_USER_ROUTES_GROUP_PREFIX,
                        'profile-information',
                    ),
                )
                .send({
                    tmpAuthUserID: userID,
                    userID: searchedUserID,
                } as GetUserProfileInformationRequestBody)
                .expect(200);

            const parsedBody =
                GetUserProfileInformationResponseBody.parse(rawBody);

            assert.isFalse(parsedBody.following);
            assert.equal(parsedBody.userID, searchedUser.uuid);
            assert.equal(parsedBody.userNickname, searchedUser.nickname);
            assert.equal(parsedBody.followersCounter, 21);
            assert.equal(parsedBody.followingCounter, 42);
            assert.equal(parsedBody.playlistsCounter, 0);
        },
    );
});
