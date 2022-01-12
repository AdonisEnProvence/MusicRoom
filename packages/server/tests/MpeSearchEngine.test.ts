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

        const { body } = await supertest(BASE_URL)
            .post('/mpe/search/my-rooms')
            .send({
                userID,
                searchQuery: '',
            } as MpeSearchMyRoomsRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = MpeSearchMyRoomsResponseBody.parse(body);

        assert.equal(parsedBody.length, mpeRooms.length);
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

        await supertest(BASE_URL)
            .post('/mpe/search/my-rooms')
            .send({
                userID: unknownUserID,
                searchQuery: '',
            } as MpeSearchMyRoomsRequestBody)
            .expect(404);
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

    test('It should list all mpe rooms', async (assert) => {
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

        const { body } = await supertest(BASE_URL)
            .post('/mpe/search/all-rooms')
            .send({
                searchQuery: '',
            } as ListAllMpeRoomsRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = ListAllMpeRoomsResponseBody.parse(body);

        assert.equal(parsedBody.length, mpeRooms.length + otherMpeRooms.length);
    });
});
