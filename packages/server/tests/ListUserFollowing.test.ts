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
import urlcat from 'urlcat';
import {
    generateArray,
    getVisibilityDatabaseEntry,
    initTestUtils,
    sortBy,
    TEST_USER_ROUTES_GROUP_PREFIX,
} from './utils/TestUtils';

const PAGE_MAX_LENGTH = 10;

test.group('List user following tests group', (group) => {
    const {
        initSocketConnection,
        disconnectEveryRemainingSocketConnection,
        createRequest,
        createUserAndAuthenticate,
    } = initTestUtils();

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
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
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

        const page1RequestBody: ListUserFollowingRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        const { body: page1BodyRaw } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send(page1RequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const page1BodyParsed =
            ListUserFollowingResponseBody.parse(page1BodyRaw);
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

        const page2RequestBody: ListUserFollowingRequestBody = {
            page: 2,
            searchQuery: '',
            userID: searchedUserID,
        };
        const { body: page2BodyRaw } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send(page2RequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const page2BodyParsed =
            ListUserFollowingResponseBody.parse(page2BodyRaw);
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
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
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
                //see https://jiangsc.me/2021/05/09/Postgres-JavaScript-and-sorting/
                .sort((a, b) => a.nickname.localeCompare(b.nickname));
        ///

        const pageRequestBody: ListUserFollowingRequestBody = {
            page: 1,
            searchQuery,
            userID: searchedUserID,
        };
        const { body: pageBodyRaw } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send(pageRequestBody)
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
        assert.deepEqual(pageBodyParsed.data, expectedData);
    });

    test('Returns an authentication error when current user is not authenticated', async () => {
        const request = createRequest();

        const searchedUserID = datatype.uuid();
        await User.create({
            uuid: searchedUserID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const pageRequestBody: ListUserFollowingRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send(pageRequestBody)
            .expect(401);
    });

    test('It should send back 404 as searched user does not exist', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const pageRequestBody: ListUserFollowingRequestBody = {
            page: 1,
            searchQuery: '',
            userID: datatype.uuid(),
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send(pageRequestBody)
            .expect(404);
    });

    test('It should send back forbidden as searched user relations visibility is PRIVATE', async () => {
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

        const pageRequestBody: ListUserFollowingRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send(pageRequestBody)
            .expect(403);
    });

    test('It should send back forbidden as searched user relations visibility is FOLLOWERS_ONLY and requesting user is not a follower', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
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

        const pageRequestBody: ListUserFollowingRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send(pageRequestBody)
            .expect(403);
    });

    test('It should send back status 200 as searched user relations visibility is FOLLOWERS_ONLY and requesting user is a follower', async () => {
        const request = createRequest();

        const requestingUser = await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
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

        const pageRequestBody: ListUserFollowingRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/following'))
            .send(pageRequestBody)
            .expect(200);
    });
});
