import Database from '@ioc:Adonis/Lucid/Database';
import {
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import MtvRoomInvitation from 'App/Models/MtvRoomInvitation';
import User from 'App/Models/User';
import { datatype, internet, random } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import { BASE_URL, initTestUtils } from './utils/TestUtils';

function generateArray<Item>(
    length: number,
    fill: (index: number) => Item,
): Item[] {
    return Array.from({ length }).map((_, index) => fill(index));
}

test.group('MtvRoom Search Engine', (group) => {
    const {
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        createSocketConnection,
        createUserAndGetSocket,
        waitFor,
    } = initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        await Database.rollbackGlobalTransaction();
    });

    test('Page must be strictly positive', async () => {
        await supertest(BASE_URL)
            .post('/search/rooms')
            .send({
                page: 0,
                searchQuery: '',
            } as MtvRoomSearchRequestBody)
            .expect(500);
    });

    test('Rooms are paginated', async (assert) => {
        const PAGE_MAX_LENGTH = 10;
        const userID = datatype.uuid();
        const creatorUserID = datatype.uuid();

        await User.create({
            uuid: creatorUserID,
            nickname: internet.userName(),
        });
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
        });

        const roomsCount = datatype.number({
            min: 11,
            max: 15,
        });

        await MtvRoom.createMany(
            generateArray(roomsCount, () => ({
                uuid: datatype.uuid(),
                runID: datatype.uuid(),
                name: random.words(2),
                creatorID: creatorUserID,
                isOpen: true,
            })),
        );

        console.log((await MtvRoom.all()).length);

        const { body: firstPageBodyRaw } = await supertest(BASE_URL)
            .post('/search/rooms')
            .send({
                page: 1,
                searchQuery: '',
                userID,
            } as MtvRoomSearchRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const firstPageBodyParsed =
            MtvRoomSearchResponse.parse(firstPageBodyRaw);
        assert.isTrue(firstPageBodyParsed.hasMore);
        assert.equal(firstPageBodyParsed.page, 1);
        assert.equal(firstPageBodyParsed.totalEntries, roomsCount);
        assert.equal(firstPageBodyParsed.data.length, PAGE_MAX_LENGTH);

        const { body: secondPageBodyRaw } = await supertest(BASE_URL)
            .post('/search/rooms')
            .send({
                page: 2,
                searchQuery: '',
                userID,
            } as MtvRoomSearchRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const secondPageBodyParsed =
            MtvRoomSearchResponse.parse(secondPageBodyRaw);
        assert.isFalse(secondPageBodyParsed.hasMore);
        assert.equal(secondPageBodyParsed.page, 2);
        assert.equal(secondPageBodyParsed.totalEntries, roomsCount);
        assert.equal(
            secondPageBodyParsed.data.length,
            roomsCount % PAGE_MAX_LENGTH,
        );
    });

    test('Rooms are paginated and filtered', async (assert) => {
        const creatorUserID = datatype.uuid();
        await User.create({
            uuid: creatorUserID,
            nickname: internet.userName(),
        });
        const rooms = await MtvRoom.createMany(
            generateArray(
                datatype.number({
                    min: 10,
                    max: 15,
                }),
                () => ({
                    uuid: datatype.uuid(),
                    runID: datatype.uuid(),
                    name: datatype.uuid(),
                    creatorID: creatorUserID,
                    isOpen: true,
                }),
            ),
        );
        const firstRoomNameFirstCharacter = rooms[0].name.charAt(0);
        const publicRoomsWithNameFirstCharacterEqualToFirstRoom = rooms.filter(
            ({ name, isOpen }) =>
                name.charAt(0) === firstRoomNameFirstCharacter && isOpen,
        );
        const roomsCount =
            publicRoomsWithNameFirstCharacterEqualToFirstRoom.length;

        const { body: pageBodyRaw } = await supertest(BASE_URL)
            .post('/search/rooms')
            .send({
                page: 1,
                searchQuery: firstRoomNameFirstCharacter,
                userID: datatype.uuid(),
            } as MtvRoomSearchRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const pageBodyParsed = MtvRoomSearchResponse.parse(pageBodyRaw);
        assert.equal(pageBodyParsed.page, 1);
        assert.equal(pageBodyParsed.totalEntries, roomsCount);
        assert.equal(pageBodyParsed.data.length, roomsCount);
    });

    test('Returns empty data if page is out of bound', async (assert) => {
        const PAGE_OUT_OF_BOUND = 100;
        const creator = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
        });
        await MtvRoom.create({
            uuid: datatype.uuid(),
            runID: datatype.uuid(),
            name: random.words(2),
            creatorID: creator.uuid,
            isOpen: true,
        });

        const { body: pageBodyRaw } = await supertest(BASE_URL)
            .post('/search/rooms')
            .send({
                page: PAGE_OUT_OF_BOUND,
                searchQuery: '',
                userID: datatype.uuid(),
            } as MtvRoomSearchRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const pageBodyParsed = MtvRoomSearchResponse.parse(pageBodyRaw);

        assert.equal(pageBodyParsed.page, PAGE_OUT_OF_BOUND);
        assert.equal(pageBodyParsed.totalEntries, 1);
        assert.isFalse(pageBodyParsed.hasMore);
        assert.isEmpty(pageBodyParsed.data);
    });

    test('Rooms should be ordered by private room first, public but invited room in second and then some public rooms', async (assert) => {
        const PAGE_MAX_LENGTH = 10;
        const userID = datatype.uuid();
        const creatorUserID = datatype.uuid();

        await createUserAndGetSocket({
            userID: creatorUserID,
        });
        await createUserAndGetSocket({
            userID,
        });

        let roomsCount = datatype.number({
            min: 12,
            max: 22,
        });

        //To make it easier to determine and understand how
        //many entries we expect we want roomsCount to be even
        //from now
        const roomsCountsIsOdd = roomsCount % 2 !== 0;
        if (roomsCountsIsOdd) {
            roomsCount++;
        }

        const publicRoomCount = roomsCount / 2;
        let privateRoomWithInvitationCount = 0;

        //Rooms with even index will be public room
        const rooms = await MtvRoom.createMany(
            generateArray(roomsCount, (index) => {
                const isIndexEven = index % 2 === 0;
                const isIndexZero = index === 0;

                return {
                    uuid: datatype.uuid(),
                    runID: datatype.uuid(),
                    name: random.words(2),
                    //Adding some complexity to the query
                    creatorID: isIndexZero ? userID : creatorUserID,
                    isOpen: isIndexEven,
                };
            }),
        );

        //Public room with invitation
        const publicRoom = rooms[10];
        const firstInvitationForPublicRoom = await MtvRoomInvitation.create({
            mtvRoomID: publicRoom.uuid,
            invitedUserID: userID,
            invitingUserID: creatorUserID,
            uuid: datatype.uuid(),
        });
        await publicRoom
            .related('invitations')
            .save(firstInvitationForPublicRoom);

        //Private room with invitation
        const privateRoom = rooms[7];
        const firstInvitationForPrivateRoom = await MtvRoomInvitation.create({
            mtvRoomID: privateRoom.uuid,
            invitedUserID: userID,
            invitingUserID: creatorUserID,
            uuid: datatype.uuid(),
        });
        await privateRoom
            .related('invitations')
            .save(firstInvitationForPrivateRoom);
        privateRoomWithInvitationCount++;

        const secondPrivateRoom = rooms[11];
        const secondInvitationForPrivateRoom = await MtvRoomInvitation.create({
            mtvRoomID: secondPrivateRoom.uuid,
            invitedUserID: userID,
            invitingUserID: creatorUserID,
            uuid: datatype.uuid(),
        });
        await secondPrivateRoom
            .related('invitations')
            .save(secondInvitationForPrivateRoom);
        privateRoomWithInvitationCount++;
        ///

        const { body: firstPageBodyRaw } = await supertest(BASE_URL)
            .post('/search/rooms')
            .send({
                page: 1,
                searchQuery: '',
                userID,
            } as MtvRoomSearchRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const firstPageBodyParsed =
            MtvRoomSearchResponse.parse(firstPageBodyRaw);

        //Pagination assertions
        const expectedEntries =
            privateRoomWithInvitationCount + publicRoomCount;
        const shouldHasMore = expectedEntries > 10;
        assert.equal(firstPageBodyParsed.hasMore, shouldHasMore);
        assert.equal(firstPageBodyParsed.page, 1);
        assert.equal(firstPageBodyParsed.totalEntries, expectedEntries);
        assert.isFalse(firstPageBodyParsed.data.length > PAGE_MAX_LENGTH);

        //Results assertions
        const expectedFirstPageBodyParsedRoomID = (
            index: number,
            expectedValues: string[],
        ): boolean => {
            const invalidIndex = index < 0 || index > roomsCount - 1;
            assert.isFalse(invalidIndex);
            if (invalidIndex) {
                throw new Error('invalid index');
            }

            return expectedValues.some(
                (expectedValue) =>
                    firstPageBodyParsed.data[index].roomID === expectedValue,
            );
        };

        assert.isTrue(
            expectedFirstPageBodyParsedRoomID(0, [
                privateRoom.uuid,
                secondPrivateRoom.uuid,
            ]),
        );
        assert.isTrue(
            expectedFirstPageBodyParsedRoomID(1, [
                privateRoom.uuid,
                secondPrivateRoom.uuid,
            ]),
        );
        assert.isTrue(expectedFirstPageBodyParsedRoomID(2, [publicRoom.uuid]));

        const firstPublicAndNotInvitedRoom = firstPageBodyParsed.data[3];
        assert.isFalse(firstPublicAndNotInvitedRoom.isInvited);
        assert.isTrue(firstPublicAndNotInvitedRoom.isOpen);
        ///
    });
});
