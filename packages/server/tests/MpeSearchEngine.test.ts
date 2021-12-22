import Database from '@ioc:Adonis/Lucid/Database';
import { MpeRoomSearchRequestBody } from 'App/Controllers/Http/MpeRoomsHttpController';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import { LibraryMpeRoomSearchResponseBody } from '@musicroom/types';
import { BASE_URL, initTestUtils, generateArray } from './utils/TestUtils';

test.group('MPE Delete Tracks', (group) => {
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

    test('Sends updated tracks list to all other users if deleting tracks succeeded', async (assert) => {
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
            .post('/mpe/search/user-rooms')
            .send({
                userID,
            } as MpeRoomSearchRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = LibraryMpeRoomSearchResponseBody.parse(body);

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

        await supertest(BASE_URL)
            .post('/mpe/search/rooms')
            .send({
                userID: datatype.uuid(),
            } as MpeRoomSearchRequestBody)
            .expect(404);
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
                userID,
            } as MpeRoomSearchRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = LibraryMpeRoomSearchResponseBody.parse(body);

        assert.equal(parsedBody.length, mpeRooms.length + otherMpeRooms.length);
    });
});
