import Database from '@ioc:Adonis/Lucid/Database';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import {
    ListAllMpeRoomsRequestBody,
    ListAllMpeRoomsResponseBody,
    MpeSearchMyRoomsRequestBody,
    MpeSearchMyRoomsResponseBody,
} from '@musicroom/types';
import { BASE_URL, initTestUtils, generateArray } from './utils/TestUtils';

test.group('My MPE Rooms Search', (group) => {
    const {
        createUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
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

    test('It should send back mpe room user has joined only', async (assert) => {
        const userID = datatype.uuid();
        const mpeRooms = generateArray({
            fill: () => ({
                roomName: random.words(3),
                roomID: datatype.uuid(),
            }),
            minLength: 3,
            maxLength: 10,
        });
        const otherMpeRooms = generateArray({
            fill: () => ({
                roomName: random.words(3),
                roomID: datatype.uuid(),
            }),
            minLength: 3,
            maxLength: 10,
        });

        await createUserAndGetSocket({
            userID: datatype.uuid(),
            mpeRoomIDToAssociate: otherMpeRooms,
        });

        await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: mpeRooms,
        });

        const requestBody: MpeSearchMyRoomsRequestBody = {
            userID,
            searchQuery: '',
            page: 1,
        };
        const { body } = await supertest(BASE_URL)
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = MpeSearchMyRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, mpeRooms.length);
    });

    test('It should fail to search not existing user mpe rooms', async () => {
        const userID = datatype.uuid();
        const mpeRooms = generateArray({
            fill: () => ({
                roomName: random.words(3),
                roomID: datatype.uuid(),
            }),
            minLength: 3,
            maxLength: 10,
        });
        const otherMpeRooms = generateArray({
            fill: () => ({
                roomName: random.words(3),
                roomID: datatype.uuid(),
            }),
            minLength: 3,
            maxLength: 10,
        });

        await createUserAndGetSocket({
            userID: datatype.uuid(),
            mpeRoomIDToAssociate: otherMpeRooms,
        });

        await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: mpeRooms,
        });

        const unknownUserID = datatype.uuid();

        const requestBody: MpeSearchMyRoomsRequestBody = {
            userID: unknownUserID,
            searchQuery: '',
            page: 1,
        };
        await supertest(BASE_URL)
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect(404);
    });

    test('Returns only rooms matching partial search query', async (assert) => {
        const userID = datatype.uuid();
        const mpeRooms: {
            roomName: string;
            roomID: string;
        }[] = [
            {
                roomID: datatype.uuid(),
                roomName: 'Biolay Playlist',
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Hubert-Félix Thiéfaine Playlist',
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Muse Playlist',
            },
        ];
        const firstMpeRoom = mpeRooms[0];

        await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: mpeRooms,
        });

        const searchQuery = firstMpeRoom.roomName.slice(0, 3);
        const requestBody: MpeSearchMyRoomsRequestBody = {
            userID,
            searchQuery,
            page: 1,
        };
        const { body } = await supertest(BASE_URL)
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = MpeSearchMyRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(parsedBody.data[0].roomName, firstMpeRoom.roomName);
    });

    test('Returns only rooms matching case insensitive search query', async (assert) => {
        const userID = datatype.uuid();
        const mpeRooms: {
            roomName: string;
            roomID: string;
        }[] = [
            {
                roomID: datatype.uuid(),
                roomName: 'Biolay Playlist',
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Hubert-Félix Thiéfaine Playlist',
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Muse Playlist',
            },
        ];
        const firstMpeRoom = mpeRooms[0];

        await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: mpeRooms,
        });

        const searchQuery = firstMpeRoom.roomName.toLowerCase();
        const requestBody: MpeSearchMyRoomsRequestBody = {
            userID,
            searchQuery,
            page: 1,
        };
        const { body } = await supertest(BASE_URL)
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = MpeSearchMyRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(parsedBody.data[0].roomName, firstMpeRoom.roomName);
    });

    test('Page must be strictly positive', async () => {
        const requestBody: MpeSearchMyRoomsRequestBody = {
            userID: datatype.uuid(),
            searchQuery: '',
            page: 0,
        };
        await supertest(BASE_URL)
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect(500);
    });

    test('Rooms are paginated', async (assert) => {
        const PAGE_MAX_LENGTH = 10;
        const userID = datatype.uuid();
        const mpeRooms = generateArray({
            fill: () => ({
                roomName: random.words(3),
                roomID: datatype.uuid(),
            }),
            minLength: 11,
            maxLength: 18,
        });
        const totalRoomsCount = mpeRooms.length;

        await createUserAndGetSocket({
            userID: userID,
            mpeRoomIDToAssociate: mpeRooms,
        });

        const firstRequestBody: MpeSearchMyRoomsRequestBody = {
            userID,
            searchQuery: '',
            page: 1,
        };
        const { body: firstPageBodyRaw } = await supertest(BASE_URL)
            .post('/mpe/search/my-rooms')
            .send(firstRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const firstPageBodyParsed =
            MpeSearchMyRoomsResponseBody.parse(firstPageBodyRaw);
        assert.isTrue(firstPageBodyParsed.hasMore);
        assert.equal(firstPageBodyParsed.page, 1);
        assert.equal(firstPageBodyParsed.totalEntries, totalRoomsCount);
        assert.equal(firstPageBodyParsed.data.length, PAGE_MAX_LENGTH);

        const secondRequestBody: MpeSearchMyRoomsRequestBody = {
            userID,
            searchQuery: '',
            page: 2,
        };
        const { body: secondPageBodyRaw } = await supertest(BASE_URL)
            .post('/mpe/search/my-rooms')
            .send(secondRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const secondPageBodyParsed =
            MpeSearchMyRoomsResponseBody.parse(secondPageBodyRaw);
        assert.isFalse(secondPageBodyParsed.hasMore);
        assert.equal(secondPageBodyParsed.page, 2);
        assert.equal(secondPageBodyParsed.totalEntries, totalRoomsCount);
        assert.equal(
            secondPageBodyParsed.data.length,
            totalRoomsCount % PAGE_MAX_LENGTH,
        );
    });
});

test.group('All MPE Rooms Search', (group) => {
    const {
        createUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
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

    test('Returns only rooms matching partial search query', async (assert) => {
        const userID = datatype.uuid();
        const mpeRooms: {
            roomName: string;
            roomID: string;
        }[] = [
            {
                roomID: datatype.uuid(),
                roomName: 'Biolay Playlist',
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Hubert-Félix Thiéfaine Playlist',
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Muse Playlist',
            },
        ];
        const firstMpeRoom = mpeRooms[0];

        await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: mpeRooms,
        });

        const searchQuery = firstMpeRoom.roomName.slice(0, 3);
        const requestBody: ListAllMpeRoomsRequestBody = {
            searchQuery,
            page: 1,
        };
        const { body } = await supertest(BASE_URL)
            .post('/mpe/search/all-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = ListAllMpeRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(parsedBody.data[0].roomName, firstMpeRoom.roomName);
    });

    test('Returns only rooms matching case insensitive search query', async (assert) => {
        const userID = datatype.uuid();
        const mpeRooms: {
            roomName: string;
            roomID: string;
        }[] = [
            {
                roomID: datatype.uuid(),
                roomName: 'Biolay Playlist',
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Hubert-Félix Thiéfaine Playlist',
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Muse Playlist',
            },
        ];
        const firstMpeRoom = mpeRooms[0];

        await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: mpeRooms,
        });

        const searchQuery = firstMpeRoom.roomName.toLowerCase();
        const requestBody: ListAllMpeRoomsRequestBody = {
            searchQuery,
            page: 1,
        };
        const { body } = await supertest(BASE_URL)
            .post('/mpe/search/all-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = ListAllMpeRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(parsedBody.data[0].roomName, firstMpeRoom.roomName);
    });

    test('Page must be strictly positive', async () => {
        const requestBody: ListAllMpeRoomsRequestBody = {
            searchQuery: '',
            page: 0,
        };
        await supertest(BASE_URL)
            .post('/mpe/search/all-rooms')
            .send(requestBody)
            .expect(500);
    });

    test('All rooms are paginated', async (assert) => {
        const PAGE_MAX_LENGTH = 10;
        const userID = datatype.uuid();
        const mpeRooms = generateArray({
            fill: () => ({
                roomName: random.words(3),
                roomID: datatype.uuid(),
            }),
            minLength: 11,
            maxLength: 18,
        });
        const otherMpeRooms = generateArray({
            fill: () => ({
                roomName: random.words(3),
                roomID: datatype.uuid(),
            }),
            minLength: 11,
            maxLength: 18,
        });
        const totalRoomsCount = mpeRooms.length + otherMpeRooms.length;

        await createUserAndGetSocket({
            userID: datatype.uuid(),
            mpeRoomIDToAssociate: otherMpeRooms,
        });

        await createUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: mpeRooms,
        });

        const firstRequestBody: ListAllMpeRoomsRequestBody = {
            searchQuery: '',
            page: 1,
        };
        const { body: firstPageBodyRaw } = await supertest(BASE_URL)
            .post('/mpe/search/all-rooms')
            .send(firstRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const firstPageBodyParsed =
            ListAllMpeRoomsResponseBody.parse(firstPageBodyRaw);
        assert.isTrue(firstPageBodyParsed.hasMore);
        assert.equal(firstPageBodyParsed.page, 1);
        assert.equal(firstPageBodyParsed.totalEntries, totalRoomsCount);
        assert.equal(firstPageBodyParsed.data.length, PAGE_MAX_LENGTH);

        const secondRequestBody: ListAllMpeRoomsRequestBody = {
            searchQuery: '',
            page: 2,
        };
        const { body: secondPageBodyRaw } = await supertest(BASE_URL)
            .post('/mpe/search/all-rooms')
            .send(secondRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const secondPageBodyParsed =
            ListAllMpeRoomsResponseBody.parse(secondPageBodyRaw);
        assert.isTrue(secondPageBodyParsed.hasMore);
        assert.equal(secondPageBodyParsed.page, 2);
        assert.equal(secondPageBodyParsed.totalEntries, totalRoomsCount);
        assert.equal(secondPageBodyParsed.data.length, PAGE_MAX_LENGTH);

        const thirdRequestBody: ListAllMpeRoomsRequestBody = {
            searchQuery: '',
            page: 3,
        };
        const { body: thirdPageBodyRaw } = await supertest(BASE_URL)
            .post('/mpe/search/all-rooms')
            .send(thirdRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const thirdPageBodyParsed =
            ListAllMpeRoomsResponseBody.parse(thirdPageBodyRaw);
        assert.isFalse(thirdPageBodyParsed.hasMore);
        assert.equal(thirdPageBodyParsed.page, 3);
        assert.equal(thirdPageBodyParsed.totalEntries, totalRoomsCount);
        assert.equal(
            thirdPageBodyParsed.data.length,
            totalRoomsCount % PAGE_MAX_LENGTH,
        );
    });
});
