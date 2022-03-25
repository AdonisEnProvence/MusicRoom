import Database from '@ioc:Adonis/Lucid/Database';
import {
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    UserSummary,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import { initTestUtils, sortBy } from './utils/TestUtils';

function generateArray<Item>(length: number, fill: () => Item): Item[] {
    return Array.from({ length }).map(() => fill());
}

const PAGE_MAX_LENGTH = 10;

test.group('Users Search Engine', (group) => {
    const { createRequest, createUserAndAuthenticate } = initTestUtils();

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('It should failed to search for users as the requesting user has not confirmed his email', async () => {
        const request = createRequest();

        const emailNotConfirmed = true;
        await createUserAndAuthenticate(request, emailNotConfirmed);

        const body: SearchUsersRequestBody = {
            page: 1,
            searchQuery: 'query',
        };
        await request.post('/search/users').send(body).expect(403);
    });

    test('Requires authentication', async () => {
        const request = createRequest();

        const body: SearchUsersRequestBody = {
            page: 1,
            searchQuery: 'a',
        };
        await request.post('/search/users').send(body).expect(401);
    });

    test('Page must be strictly positive', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const body: SearchUsersRequestBody = {
            page: 0,
            searchQuery: 'a',
        };
        await request.post('/search/users').send(body).expect(500);
    });

    test('Returns an error when search query is empty', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const body: SearchUsersRequestBody = {
            page: 1,
            searchQuery: '',
        };
        await request.post('/search/users').send(body).expect(500);
    });

    test('Users are paginated and filtered', async (assert) => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const usersCount = datatype.number({
            min: 11,
            max: 15,
        });
        const users = await User.createMany(
            generateArray(usersCount, () => ({
                uuid: datatype.uuid(),
                nickname: internet.userName(),
                email: internet.email(),
                password: internet.password(),
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

        const body: SearchUsersRequestBody = {
            page: 1,
            searchQuery: firstUserNicknameFirstCharacter,
        };
        const { body: pageBodyRaw } = await request
            .post('/search/users')
            .send(body)
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
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);

        const body: SearchUsersRequestBody = {
            page: PAGE_OUT_OF_BOUND,
            searchQuery: user.nickname,
        };
        const { body: pageBodyRaw } = await request
            .post('/search/users')
            .send(body)
            .expect('Content-Type', /json/)
            .expect(200);
        const pageBodyParsed = SearchUsersResponseBody.parse(pageBodyRaw);

        assert.equal(pageBodyParsed.page, PAGE_OUT_OF_BOUND);
        assert.equal(pageBodyParsed.totalEntries, 0);
        assert.isFalse(pageBodyParsed.hasMore);
        assert.isEmpty(pageBodyParsed.data);
    });
});
