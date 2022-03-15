import Database from '@ioc:Adonis/Lucid/Database';
import {
    ListUserFollowersRequestBody,
    ListUserFollowersResponseBody,
    UserSummary,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet, unique } from 'faker';
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

test.group('List user followers tests group', (group) => {
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

    test('It should retrieve paginated user followers', async (assert) => {
        const request = createRequest();

        const requestUser = await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: unique(() => internet.userName()),
            email: internet.email(),
            password: internet.password(),
        });

        const users = await User.createMany(
            generateArray({
                fill: () => ({
                    uuid: datatype.uuid(),
                    nickname: unique(() => internet.userName()),
                    email: internet.email(),
                    password: internet.password(),
                }),
                minLength: 22,
                maxLength: 30,
            }),
        );

        //Follow relationship set up
        const followersCounter = datatype.number({
            max: 15,
            min: 11,
        });
        const searchedUserFollowersUserSummary: UserSummary[] = (
            await Promise.all(
                users.map(async (user, index) => {
                    if (index < followersCounter) {
                        await searchedUser.related('followers').save(user);
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

        const sortedByNicknameSearchedUserFollowersUserSummary: UserSummary[] =
            sortBy(
                searchedUserFollowersUserSummary.map(
                    ({ userID, nickname }) => ({
                        userID,
                        nickname,
                    }),
                ),
                'nickname',
            );
        ///

        const page1RequestBody: ListUserFollowersRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        const { body: page1BodyRaw } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/followers'))
            .send(page1RequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const page1BodyParsed =
            ListUserFollowersResponseBody.parse(page1BodyRaw);
        console.log({ pageBodyParsed: page1BodyParsed });
        assert.equal(page1BodyParsed.page, 1);
        assert.equal(
            page1BodyParsed.totalEntries,
            sortedByNicknameSearchedUserFollowersUserSummary.length,
        );
        assert.isTrue(page1BodyParsed.hasMore);
        assert.equal(page1BodyParsed.data.length, PAGE_MAX_LENGTH);
        assert.deepEqual(
            page1BodyParsed.data,
            sortedByNicknameSearchedUserFollowersUserSummary.slice(
                0,
                PAGE_MAX_LENGTH,
            ),
        );

        const page2RequestBody: ListUserFollowersRequestBody = {
            page: 2,
            searchQuery: '',
            userID: searchedUserID,
        };
        const { body: page2BodyRaw } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/followers'))
            .send(page2RequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const page2BodyParsed =
            ListUserFollowersResponseBody.parse(page2BodyRaw);
        console.log({ pageBodyParsed: page2BodyParsed });
        assert.equal(page2BodyParsed.page, 2);
        assert.equal(
            page2BodyParsed.totalEntries,
            sortedByNicknameSearchedUserFollowersUserSummary.length,
        );
        assert.isFalse(page2BodyParsed.hasMore);
        assert.equal(
            page2BodyParsed.data.length,
            sortedByNicknameSearchedUserFollowersUserSummary.length -
                PAGE_MAX_LENGTH,
        );
        assert.deepEqual(
            page2BodyParsed.data,
            sortedByNicknameSearchedUserFollowersUserSummary.slice(
                PAGE_MAX_LENGTH,
                PAGE_MAX_LENGTH * 2,
            ),
        );
    });

    test('It should retrieve filtered user followers', async (assert) => {
        const request = createRequest();

        const requestingUser = await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: unique(() => internet.userName()),
            email: internet.email(),
            password: internet.password(),
        });

        const searchQuery = datatype.string(1);
        const users = await User.createMany(
            generateArray({
                fill: (index) => ({
                    uuid: datatype.uuid(),
                    nickname: `${index % 2 === 0 ? searchQuery : ''}${unique(
                        () => internet.userName(),
                    )}`,
                    email: internet.email(),
                    password: internet.password(),
                }),
                minLength: 20,
                maxLength: 20,
            }),
        );

        //Follow relationship set up
        const followersCounter = datatype.number({
            max: 10,
            min: 8,
        });
        const searchedUserFollowersUserSummary: UserSummary[] = (
            await Promise.all(
                users.map(async (user, index) => {
                    if (index < followersCounter) {
                        await searchedUser.related('followers').save(user);
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
        const matchingSearchQuerySortedByNicknameSearchedUserFollowers =
            searchedUserFollowersUserSummary
                .filter((user) =>
                    user.nickname
                        .toLowerCase()
                        .startsWith(searchQuery.toLowerCase()),
                )
                //see https://jiangsc.me/2021/05/09/Postgres-JavaScript-and-sorting/
                .sort((a, b) => a.nickname.localeCompare(b.nickname));
        ///

        const pageRequestBody: ListUserFollowersRequestBody = {
            page: 1,
            searchQuery,
            userID: searchedUserID,
        };
        const { body: pageBodyRaw } = await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/followers'))
            .send(pageRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);

        const pageBodyParsed = ListUserFollowersResponseBody.parse(pageBodyRaw);

        assert.equal(pageBodyParsed.page, 1);
        assert.equal(
            pageBodyParsed.totalEntries,
            matchingSearchQuerySortedByNicknameSearchedUserFollowers.length,
        );
        assert.isFalse(pageBodyParsed.hasMore);
        assert.equal(
            pageBodyParsed.data.length,
            matchingSearchQuerySortedByNicknameSearchedUserFollowers.length,
        );
        const expectedData =
            matchingSearchQuerySortedByNicknameSearchedUserFollowers.slice(
                0,
                PAGE_MAX_LENGTH,
            );
        console.log('ACTUAL', pageBodyParsed.data);
        console.log('EXPECTED', expectedData);
        assert.deepEqual(pageBodyParsed.data, expectedData);
    });

    test('Returns an authentication user when current user is not authenticated and tries to search the followers of another user', async () => {
        const request = createRequest();

        const searchedUserID = datatype.uuid();
        await User.create({
            uuid: searchedUserID,
            nickname: unique(() => internet.userName()),
            email: internet.email(),
            password: internet.password(),
        });

        const pageRequestBody: ListUserFollowersRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/followers'))
            .send(pageRequestBody)
            .expect(401);
    });

    test('It should send back 404 as searched user does not exist', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const pageRequestBody: ListUserFollowersRequestBody = {
            page: 1,
            searchQuery: '',
            userID: datatype.uuid(),
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/followers'))
            .send(pageRequestBody)
            .expect(404);
    });

    test('It should send back forbidden as searched user relations visibility is PRIVATE', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: unique(() => internet.userName()),
            email: internet.email(),
            password: internet.password(),
        });

        const privateVisibility = await getVisibilityDatabaseEntry('PRIVATE');
        await searchedUser
            .related('relationsVisibilitySetting')
            .associate(privateVisibility);

        const pageRequestBody: ListUserFollowersRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/followers'))
            .send(pageRequestBody)
            .expect(403);
    });

    test('It should send back forbidden as searched user relations visibility is FOLLOWERS_ONLY and requesting user is not a follower', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: unique(() => internet.userName()),
            email: internet.email(),
            password: internet.password(),
        });

        const followersOnlyVisibility = await getVisibilityDatabaseEntry(
            'FOLLOWERS_ONLY',
        );
        await searchedUser
            .related('relationsVisibilitySetting')
            .associate(followersOnlyVisibility);

        const pageRequestBody: ListUserFollowersRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/followers'))
            .send(pageRequestBody)
            .expect(403);
    });

    test('It should send back status 200 as searched user relations visibility is FOLLOWERS_ONLY and requesting user is a follower', async () => {
        const request = createRequest();

        const requestingUser = await createUserAndAuthenticate(request);

        const searchedUserID = datatype.uuid();
        const searchedUser = await User.create({
            uuid: searchedUserID,
            nickname: unique(() => internet.userName()),
            email: internet.email(),
            password: internet.password(),
        });

        const followersOnlyVisibility = await getVisibilityDatabaseEntry(
            'FOLLOWERS_ONLY',
        );
        await searchedUser
            .related('relationsVisibilitySetting')
            .associate(followersOnlyVisibility);

        await searchedUser.related('followers').save(requestingUser);

        const pageRequestBody: ListUserFollowersRequestBody = {
            page: 1,
            searchQuery: '',
            userID: searchedUserID,
        };
        await request
            .post(urlcat(TEST_USER_ROUTES_GROUP_PREFIX, 'search/followers'))
            .send(pageRequestBody)
            .expect(200);
    });
});
