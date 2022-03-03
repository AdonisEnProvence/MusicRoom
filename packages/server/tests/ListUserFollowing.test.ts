import Database from '@ioc:Adonis/Lucid/Database';
import {
    ListUserFollowingRequestBody,
    ListUserFollowingResponseBody,
    UserSummary,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    generateArray,
    getVisibilityDatabaseEntry,
    initTestUtils,
    sortBy,
    TEST_USER_ROUTES_GROUP_PREFIX,
} from './utils/TestUtils';

const PAGE_MAX_LENGTH = 10;

test.group('List user following tests group', (group) => {
    const { initSocketConnection, disconnectEveryRemainingSocketConnection } =
        initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        sinon.restore();
        await Database.rollbackGlobalTransaction();
    });

    test('It should retrieve paginated user following', async (assert) => {
        const requestingUserID = datatype.uuid();
        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        await User.create({
            uuid: requestingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const users = await User.createMany(
            generateArray({
                fill: () => ({
                    uuid: datatype.uuid(),
                    nickname: internet.userName(),
                    email: internet.email(),
                    password: internet.password(),
                }),
                minLength: 22,
                maxLength: 30,
            }),
        );

        //Follow relationship set up
        const followingCounter = datatype.number({
            max: 15,
            min: 11,
        });
        const searchedUserFollowingUserSummary: UserSummary[] = (
            await Promise.all(
                users.map(async (user, index) => {
                    if (index < followingCounter) {
                        await searchedUser.related('following').save(user);
                        return {
                            userID: user.uuid,
                            nickname: user.nickname,
                        };
                    }

                    return undefined;
                }),
            )
        ).filter(
            (el: UserSummary | undefined): el is UserSummary =>
                el !== undefined,
        );

        const sortedByNicknameSearchedUserFollowingUserSummary: UserSummary[] =
            sortBy(
                searchedUserFollowingUserSummary.map(
                    ({ userID, nickname }) => ({
                        userID,
                        nickname,
                    }),
                ),
                'nickname',
            );
        ///

        const { body: page1BodyRaw } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send({
                page: 1,
                searchQuery: '',
                userID: searchedUserID,
                tmpAuthUserID: requestingUserID,
            } as ListUserFollowingRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const page1BodyParsed =
            ListUserFollowingResponseBody.parse(page1BodyRaw);
        console.log('ACTUAL', page1BodyParsed);
        assert.equal(page1BodyParsed.page, 1);
        assert.equal(
            page1BodyParsed.totalEntries,
            sortedByNicknameSearchedUserFollowingUserSummary.length,
        );
        assert.isTrue(page1BodyParsed.hasMore);
        assert.equal(page1BodyParsed.data.length, PAGE_MAX_LENGTH);
        assert.deepEqual(
            page1BodyParsed.data,
            sortedByNicknameSearchedUserFollowingUserSummary.slice(
                0,
                PAGE_MAX_LENGTH,
            ),
        );

        const { body: page2BodyRaw } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send({
                page: 2,
                searchQuery: '',
                userID: searchedUserID,
                tmpAuthUserID: requestingUserID,
            } as ListUserFollowingRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const page2BodyParsed =
            ListUserFollowingResponseBody.parse(page2BodyRaw);
        console.log({ pageBodyParsed: page2BodyParsed });
        assert.equal(page2BodyParsed.page, 2);
        assert.equal(
            page2BodyParsed.totalEntries,
            sortedByNicknameSearchedUserFollowingUserSummary.length,
        );
        assert.isFalse(page2BodyParsed.hasMore);
        assert.equal(
            page2BodyParsed.data.length,
            sortedByNicknameSearchedUserFollowingUserSummary.length -
                PAGE_MAX_LENGTH,
        );
        assert.deepEqual(
            page2BodyParsed.data,
            sortedByNicknameSearchedUserFollowingUserSummary.slice(
                PAGE_MAX_LENGTH,
                PAGE_MAX_LENGTH * 2,
            ),
        );
    });

    test('It should retrieve filtered user following', async (assert) => {
        const requestingUserID = datatype.uuid();
        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        await User.create({
            uuid: requestingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const searchQuery = datatype.string(1);
        const users = await User.createMany(
            generateArray({
                fill: (index) => ({
                    uuid: datatype.uuid(),
                    nickname: `${
                        index % 2 === 0 ? searchQuery : ''
                    }${internet.userName()}`,
                    email: internet.email(),
                    password: internet.password(),
                }),
                minLength: 20,
                maxLength: 20,
            }),
        );

        //Follow relationship set up
        const followingCounter = datatype.number({
            max: 10,
            min: 8,
        });
        const searchedUserFollowingUserSummary: UserSummary[] = (
            await Promise.all(
                users.map(async (user, index) => {
                    if (index < followingCounter) {
                        await searchedUser.related('following').save(user);
                        return {
                            userID: user.uuid,
                            nickname: user.nickname,
                        };
                    }

                    return undefined;
                }),
            )
        ).filter(
            (el: UserSummary | undefined): el is UserSummary =>
                el !== undefined,
        );
        ///

        //filtering options
        const matchingSearchQuerySortedByNicknameSearchedUserFollowing =
            searchedUserFollowingUserSummary
                .filter((user) =>
                    user.nickname
                        .toLowerCase()
                        .startsWith(searchQuery.toLowerCase()),
                )
                .sort((a, b) => {
                    if (a.nickname.toLowerCase() < b.nickname.toLowerCase()) {
                        return -1;
                    }
                    if (a.nickname.toLowerCase() > b.nickname.toLowerCase()) {
                        return 1;
                    }
                    return 0;
                });
        ///

        const { body: pageBodyRaw } = await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send({
                page: 1,
                searchQuery,
                userID: searchedUserID,
                tmpAuthUserID: requestingUserID,
            } as ListUserFollowingRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);

        const pageBodyParsed = ListUserFollowingResponseBody.parse(pageBodyRaw);

        assert.equal(pageBodyParsed.page, 1);
        assert.equal(
            pageBodyParsed.totalEntries,
            matchingSearchQuerySortedByNicknameSearchedUserFollowing.length,
        );
        assert.isFalse(pageBodyParsed.hasMore);
        assert.equal(
            pageBodyParsed.data.length,
            matchingSearchQuerySortedByNicknameSearchedUserFollowing.length,
        );
        const expectedData =
            matchingSearchQuerySortedByNicknameSearchedUserFollowing.slice(
                0,
                PAGE_MAX_LENGTH,
            );
        console.log('ACTUAL', pageBodyParsed.data);
        console.log('EXPECTED', expectedData);
        assert.deepEqual(pageBodyParsed.data, expectedData);
    });

    test('It should send back 404 as requesting user does not exist', async () => {
        const requestingUserID = datatype.uuid();
        const searchedUserID = datatype.uuid();
        await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send({
                page: 1,
                searchQuery: '',
                userID: searchedUserID,
                tmpAuthUserID: requestingUserID,
            } as ListUserFollowingRequestBody)
            .expect(404);
    });

    test('It should send back 404 as searched user does not exist', async () => {
        const requestingUserID = datatype.uuid();
        const searchedUserID = datatype.uuid();
        await User.create({
            uuid: requestingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send({
                page: 1,
                searchQuery: '',
                userID: searchedUserID,
                tmpAuthUserID: requestingUserID,
            } as ListUserFollowingRequestBody)
            .expect(404);
    });

    test('It should send back forbidden as searched user relations visibility is PRIVATE', async () => {
        const requestingUserID = datatype.uuid();
        const searchedUserID = datatype.uuid();
        await User.create({
            uuid: requestingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
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

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send({
                page: 1,
                searchQuery: '',
                userID: searchedUserID,
                tmpAuthUserID: requestingUserID,
            } as ListUserFollowingRequestBody)
            .expect(403);
    });

    test('It should send back forbidden as searched user relations visibility is FOLLOWERS_ONLY and requesting user is not a follower', async () => {
        const requestingUserID = datatype.uuid();
        const searchedUserID = datatype.uuid();
        await User.create({
            uuid: requestingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const followingOnlyVisibility = await getVisibilityDatabaseEntry(
            'FOLLOWERS_ONLY',
        );
        await searchedUser
            .related('relationsVisibilitySetting')
            .associate(followingOnlyVisibility);

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send({
                page: 1,
                searchQuery: '',
                userID: searchedUserID,
                tmpAuthUserID: requestingUserID,
            } as ListUserFollowingRequestBody)
            .expect(403);
    });

    test('It should send back status 200 as searched user relations visibility is FOLLOWERS_ONLY and requesting user is a follower', async () => {
        const requestingUserID = datatype.uuid();
        const searchedUserID = datatype.uuid();
        const requestingUser = await User.create({
            uuid: requestingUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const followingOnlyVisibility = await getVisibilityDatabaseEntry(
            'FOLLOWERS_ONLY',
        );
        await searchedUser
            .related('relationsVisibilitySetting')
            .associate(followingOnlyVisibility);

        await searchedUser.related('followers').save(requestingUser);

        await supertest(BASE_URL)
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send({
                page: 1,
                searchQuery: '',
                userID: searchedUserID,
                tmpAuthUserID: requestingUserID,
            } as ListUserFollowingRequestBody)
            .expect(200);
    });
});
