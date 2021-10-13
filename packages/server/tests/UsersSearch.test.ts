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
        await supertest(BASE_URL)
            .post('/search/users')
            .send({
                page: 0,
                searchQuery: '',
            } as SearchUsersRequestBody)
            .expect(500);
    });

    test('Users are paginated', async (assert) => {
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
        const usersSorted: UserSummary[] = sortBy(
            users.map(({ uuid, nickname }) => ({ id: uuid, nickname })),
            'nickname',
        );

        const { body: firstPageBodyRaw } = await supertest(BASE_URL)
            .post('/search/users')
            .send({
                page: 1,
                searchQuery: '',
            } as SearchUsersRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const firstPageBodyParsed =
            SearchUsersResponseBody.parse(firstPageBodyRaw);
        assert.isTrue(firstPageBodyParsed.hasMore);
        assert.equal(firstPageBodyParsed.page, 1);
        assert.equal(firstPageBodyParsed.totalEntries, usersCount);
        assert.equal(firstPageBodyParsed.data.length, PAGE_MAX_LENGTH);
        assert.deepEqual(
            firstPageBodyParsed.data,
            usersSorted.slice(0, PAGE_MAX_LENGTH),
        );

        const { body: secondPageBodyRaw } = await supertest(BASE_URL)
            .post('/search/users')
            .send({
                page: 2,
                searchQuery: '',
            } as SearchUsersRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const secondPageBodyParsed =
            SearchUsersResponseBody.parse(secondPageBodyRaw);
        assert.isFalse(secondPageBodyParsed.hasMore);
        assert.equal(secondPageBodyParsed.page, 2);
        assert.equal(secondPageBodyParsed.totalEntries, usersCount);
        assert.equal(
            secondPageBodyParsed.data.length,
            usersCount % PAGE_MAX_LENGTH,
        );
        assert.deepEqual(
            secondPageBodyParsed.data,
            usersSorted.slice(PAGE_MAX_LENGTH),
        );
    });

    test('Users are paginated and filtered', async (assert) => {
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
                    ({ uuid, nickname }) => ({ id: uuid, nickname }),
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

    test('Returns empty data if page is out of bound', async (assert) => {
        const PAGE_OUT_OF_BOUND = 100;

        await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
        });

        const { body: pageBodyRaw } = await supertest(BASE_URL)
            .post('/search/users')
            .send({
                page: PAGE_OUT_OF_BOUND,
                searchQuery: '',
            } as SearchUsersRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const pageBodyParsed = SearchUsersResponseBody.parse(pageBodyRaw);

        assert.equal(pageBodyParsed.page, PAGE_OUT_OF_BOUND);
        assert.equal(pageBodyParsed.totalEntries, 1);
        assert.isFalse(pageBodyParsed.hasMore);
        assert.isEmpty(pageBodyParsed.data);
    });
});
