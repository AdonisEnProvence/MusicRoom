import Database from '@ioc:Adonis/Lucid/Database';
import {
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    UserSummary,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import { BASE_URL, sortBy } from './utils/TestUtils';

function generateArray<Item>(length: number, fill: () => Item): Item[] {
    return Array.from({ length }).map(() => fill());
}

const PAGE_MAX_LENGTH = 10;

test.group('Users Search Engine', (group) => {
    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('Page must be strictly positive', async () => {
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post('/search/users')
            .send({
                page: 0,
                searchQuery: user.nickname,
                userID,
            } as SearchUsersRequestBody)
            .expect(500);
    });

    test('Returns an error when search query is empty', async () => {
        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post('/search/users')
            .send({
                page: 1,
                searchQuery: '',
                userID,
            } as SearchUsersRequestBody)
            .expect(500);
    });

    test('Returns an error when userID is empty', async () => {
        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        await supertest(BASE_URL)
            .post('/search/users')
            .send({
                page: 1,
                searchQuery: '',
            } as SearchUsersRequestBody)
            .expect(500);
    });

    test('Users are paginated and filtered', async (assert) => {
        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        const usersCount = datatype.number({
            min: 11,
            max: 15,
        });
        const users = await User.createMany(
            generateArray(usersCount, () => ({
                uuid: datatype.uuid(),
                nickname: internet.userName(),
            })),
        );
        const firstUserNicknameFirstCharacter = users[0].nickname.charAt(0);
        const usersWithNicknameFirstCharacterEqualToFirstUser = users.filter(
            ({ nickname }) =>
                nickname.charAt(0) === firstUserNicknameFirstCharacter,
        );
        const filteredUsersWithNicknameFirstCharacterEqualToFirstUser: UserSummary[] =
            sortBy(
                usersWithNicknameFirstCharacterEqualToFirstUser.map(
                    ({ uuid, nickname }) => ({ userID: uuid, nickname }),
                ),
                'nickname',
            );
        const filteredUsersCount =
            usersWithNicknameFirstCharacterEqualToFirstUser.length;

        const { body: pageBodyRaw } = await supertest(BASE_URL)
            .post('/search/users')
            .send({
                page: 1,
                searchQuery: firstUserNicknameFirstCharacter,
                userID,
            } as SearchUsersRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const pageBodyParsed = SearchUsersResponseBody.parse(pageBodyRaw);
        assert.equal(pageBodyParsed.page, 1);
        assert.equal(pageBodyParsed.totalEntries, filteredUsersCount);
        assert.equal(pageBodyParsed.data.length, filteredUsersCount);
        assert.deepEqual(
            pageBodyParsed.data,
            filteredUsersWithNicknameFirstCharacterEqualToFirstUser.slice(
                0,
                PAGE_MAX_LENGTH,
            ),
        );
    });

    test('Returns empty data if page is out of bound, also expect user to do not find himself in totalEntries', async (assert) => {
        const PAGE_OUT_OF_BOUND = 100;
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        const { body: pageBodyRaw } = await supertest(BASE_URL)
            .post('/search/users')
            .send({
                page: PAGE_OUT_OF_BOUND,
                searchQuery: user.nickname,
                userID,
            } as SearchUsersRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const pageBodyParsed = SearchUsersResponseBody.parse(pageBodyRaw);

        assert.equal(pageBodyParsed.page, PAGE_OUT_OF_BOUND);
        assert.equal(pageBodyParsed.totalEntries, 0);
        assert.isFalse(pageBodyParsed.hasMore);
        assert.isEmpty(pageBodyParsed.data);
    });
});
