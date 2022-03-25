import Database from '@ioc:Adonis/Lucid/Database';
import { datatype, lorem, internet } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import {
    ListAllMpeRoomsRequestBody,
    ListAllMpeRoomsResponseBody,
    MpeRoomSummary,
    MpeSearchMyRoomsRequestBody,
    MpeSearchMyRoomsResponseBody,
    UserSearchMpeRoomsRequestBody,
    UserSearchMpeRoomsResponseBody,
} from '@musicroom/types';
import MpeRoom from 'App/Models/MpeRoom';
import User from 'App/Models/User';
import {
    initTestUtils,
    generateArray,
    getVisibilityDatabaseEntry,
    getSocketApiAuthToken,
} from './utils/TestUtils';

test.group('My MPE Rooms Search', (group) => {
    const {
        createAuthenticatedUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        createRequest,
        createUserAndAuthenticate,
        associateMpeRoomListToUser,
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

    test('Requires authentication', async () => {
        const request = createRequest();

        const requestBody: MpeSearchMyRoomsRequestBody = {
            searchQuery: '',
            page: 1,
        };
        await request
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect(401);
    });

    test('It should send back mpe room user has joined only', async (assert) => {
        const request = createRequest();

        const mpeRooms = generateArray({
            fill: () => ({
                roomName: lorem.sentence(),
                roomID: datatype.uuid(),
            }),
            minLength: 3,
            maxLength: 10,
        });
        const otherMpeRooms = generateArray({
            fill: () => ({
                roomName: lorem.sentence(),
                roomID: datatype.uuid(),
            }),
            minLength: 3,
            maxLength: 10,
        });

        const user = await createUserAndAuthenticate(request);
        await associateMpeRoomListToUser({
            user,
            mpeRoomList: mpeRooms,
        });

        await createAuthenticatedUserAndGetSocket({
            userID: datatype.uuid(),
            mpeRoomIDToAssociate: otherMpeRooms,
        });

        const requestBody: MpeSearchMyRoomsRequestBody = {
            searchQuery: '',
            page: 1,
        };
        const { body } = await request
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = MpeSearchMyRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, mpeRooms.length);
    });

    test('Returns only rooms matching partial search query', async (assert) => {
        const request = createRequest();

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

        const user = await createUserAndAuthenticate(request);
        await associateMpeRoomListToUser({
            user,
            mpeRoomList: mpeRooms,
        });

        const searchQuery = firstMpeRoom.roomName.slice(0, 3);
        const requestBody: MpeSearchMyRoomsRequestBody = {
            searchQuery,
            page: 1,
        };
        const { body } = await request
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = MpeSearchMyRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(parsedBody.data[0].roomName, firstMpeRoom.roomName);
    });

    test('Returns only rooms matching case insensitive search query', async (assert) => {
        const request = createRequest();

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

        const user = await createUserAndAuthenticate(request);
        await associateMpeRoomListToUser({
            user,
            mpeRoomList: mpeRooms,
        });

        const searchQuery = firstMpeRoom.roomName.toLowerCase();
        const requestBody: MpeSearchMyRoomsRequestBody = {
            searchQuery,
            page: 1,
        };
        const { body } = await request
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = MpeSearchMyRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(parsedBody.data[0].roomName, firstMpeRoom.roomName);
    });

    test('Page must be strictly positive', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const requestBody: MpeSearchMyRoomsRequestBody = {
            searchQuery: '',
            page: 0,
        };
        await request
            .post('/mpe/search/my-rooms')
            .send(requestBody)
            .expect(500);
    });

    test('Rooms are paginated', async (assert) => {
        const request = createRequest();

        const PAGE_MAX_LENGTH = 10;
        const mpeRooms = generateArray({
            fill: () => ({
                roomName: lorem.sentence(),
                roomID: datatype.uuid(),
            }),
            minLength: 11,
            maxLength: 22,
        });
        const totalRoomsCount = mpeRooms.length;

        const userID = datatype.uuid();
        const socket = await createAuthenticatedUserAndGetSocket({
            userID,
            mpeRoomIDToAssociate: mpeRooms,
        });
        const token = getSocketApiAuthToken(socket);

        let page = 1;
        let hasMore = true;
        let totalFetchedEntries = 0;
        while (hasMore === true) {
            const requestBody: MpeSearchMyRoomsRequestBody = {
                searchQuery: '',
                page,
            };

            const { body: pageBodyRaw } = await request
                .post('/mpe/search/my-rooms')
                .set('Authorization', `bearer ${token}`)
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(200);
            const pageBodyParsed =
                MpeSearchMyRoomsResponseBody.parse(pageBodyRaw);

            assert.equal(pageBodyParsed.page, page);
            assert.equal(pageBodyParsed.totalEntries, totalRoomsCount);
            assert.isAtMost(pageBodyParsed.data.length, PAGE_MAX_LENGTH);

            totalFetchedEntries += pageBodyParsed.data.length;
            hasMore = pageBodyParsed.hasMore;
            page++;
        }

        assert.equal(totalFetchedEntries, totalRoomsCount);

        const extraRequestBody: MpeSearchMyRoomsRequestBody = {
            searchQuery: '',
            page,
        };
        const { body: extraPageBodyRaw } = await request
            .post('/mpe/search/my-rooms')
            .set('Authorization', `bearer ${token}`)
            .send(extraRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const extraPageBodyParsed =
            MpeSearchMyRoomsResponseBody.parse(extraPageBodyRaw);

        assert.equal(extraPageBodyParsed.page, page);
        assert.equal(extraPageBodyParsed.totalEntries, totalRoomsCount);
        assert.equal(extraPageBodyParsed.data.length, 0);
        assert.isFalse(extraPageBodyParsed.hasMore);
    });
});

test.group("Other user's MPE Rooms Search", (group) => {
    const {
        createAuthenticatedUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
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

    test('It should failed to unfollow user as the requesting user has not confirmed his email', async () => {
        const request = createRequest();

        const emailNotConfirmed = true;
        await createUserAndAuthenticate(request, emailNotConfirmed);

        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const requestBody: UserSearchMpeRoomsRequestBody = {
            userID,
            searchQuery: '',
            page: 1,
        };
        await request.post('/user/search/mpe').send(requestBody).expect(403);
    });

    test("It should send back all other user's public MPE rooms", async (assert) => {
        const PAGE_MAX_LENGTH = 10;
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const otherUserID = datatype.uuid();
        const otherUserPrivateRooms = generateArray({
            fill: () => ({
                roomName: lorem.sentence(),
                roomID: datatype.uuid(),
                isOpen: false,
            }),
            minLength: 3,
            maxLength: 10,
        });
        const otherUserPublicRooms = generateArray({
            fill: () => ({
                roomName: lorem.sentence(),
                roomID: datatype.uuid(),
                isOpen: true,
            }),
            minLength: 11,
            maxLength: 22,
        });
        await createAuthenticatedUserAndGetSocket({
            userID: otherUserID,
            mpeRoomIDToAssociate: [
                ...otherUserPrivateRooms,
                ...otherUserPublicRooms,
            ],
        });
        const otherUser = await User.findOrFail(otherUserID);
        const otherUserPublicRoomsOrderedByUUID = await MpeRoom.query()
            .whereIn(
                'uuid',
                otherUserPublicRooms.map((room) => room.roomID),
            )
            .orderBy('uuid', 'asc');
        const formattedOtherUserPublicRoomsOrderedByUUID =
            otherUserPublicRoomsOrderedByUUID.map(({ uuid, isOpen, name }) => ({
                roomID: uuid,
                isOpen,
                roomName: name,
                creatorName: otherUser.nickname,
                isInvited: false,
            }));
        const totalPublicRoomsCount =
            formattedOtherUserPublicRoomsOrderedByUUID.length;

        let page = 1;
        let hasMore = true;
        const fetchedEntries: MpeRoomSummary[] = [];
        while (hasMore === true) {
            const requestBody: UserSearchMpeRoomsRequestBody = {
                userID: otherUserID,
                searchQuery: '',
                page,
            };

            const { body: pageBodyRaw } = await request
                .post('/user/search/mpe')
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(200);
            const pageBodyParsed =
                UserSearchMpeRoomsResponseBody.parse(pageBodyRaw);

            assert.equal(pageBodyParsed.page, page);
            assert.equal(pageBodyParsed.totalEntries, totalPublicRoomsCount);
            assert.isAtMost(pageBodyParsed.data.length, PAGE_MAX_LENGTH);

            fetchedEntries.push(...pageBodyParsed.data);
            hasMore = pageBodyParsed.hasMore;
            page++;
        }

        assert.deepEqual(
            fetchedEntries,
            formattedOtherUserPublicRoomsOrderedByUUID,
        );

        const extraRequestBody: UserSearchMpeRoomsRequestBody = {
            userID: otherUserID,
            searchQuery: '',
            page,
        };
        const { body: extraPageBodyRaw } = await request
            .post('/user/search/mpe')
            .send(extraRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const extraPageBodyParsed =
            UserSearchMpeRoomsResponseBody.parse(extraPageBodyRaw);

        assert.equal(extraPageBodyParsed.page, page);
        assert.equal(extraPageBodyParsed.totalEntries, totalPublicRoomsCount);
        assert.equal(extraPageBodyParsed.data.length, 0);
        assert.isFalse(extraPageBodyParsed.hasMore);
    });

    test('It should fail when querying the MPE rooms of an unknown user', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const unknownUserID = datatype.uuid();

        const requestBody: UserSearchMpeRoomsRequestBody = {
            userID: unknownUserID,
            searchQuery: '',
            page: 1,
        };
        await request.post('/user/search/mpe').send(requestBody).expect(404);
    });

    test('Returns an authentication error when the current user is unauthenticated', async () => {
        const request = createRequest();

        const otherUserID = datatype.uuid();
        await createAuthenticatedUserAndGetSocket({
            userID: otherUserID,
        });

        const requestBody: UserSearchMpeRoomsRequestBody = {
            userID: otherUserID,
            searchQuery: '',
            page: 1,
        };
        await request.post('/user/search/mpe').send(requestBody).expect(401);
    });

    test('Returns only public MPE rooms matching partial search query', async (assert) => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const otherUserID = datatype.uuid();
        const otherUserMpeRooms: {
            roomName: string;
            roomID: string;
            isOpen: true;
        }[] = [
            {
                roomID: datatype.uuid(),
                roomName: 'Biolay Playlist',
                isOpen: true,
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Hubert-Félix Thiéfaine Playlist',
                isOpen: true,
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Muse Playlist',
                isOpen: true,
            },
        ];
        const firstOtherUserMpeRoom = otherUserMpeRooms[0];
        await createAuthenticatedUserAndGetSocket({
            userID: otherUserID,
            mpeRoomIDToAssociate: otherUserMpeRooms,
        });

        const searchQuery = firstOtherUserMpeRoom.roomName.slice(0, 3);
        const requestBody: UserSearchMpeRoomsRequestBody = {
            userID: otherUserID,
            searchQuery,
            page: 1,
        };
        const { body } = await request
            .post('/user/search/mpe')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = UserSearchMpeRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(
            parsedBody.data[0].roomName,
            firstOtherUserMpeRoom.roomName,
        );
    });

    test('Returns only public MPE rooms matching case insensitive search query', async (assert) => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const otherUserID = datatype.uuid();
        const otherUserMpeRooms: {
            roomName: string;
            roomID: string;
            isOpen: true;
        }[] = [
            {
                roomID: datatype.uuid(),
                roomName: 'Biolay Playlist',
                isOpen: true,
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Hubert-Félix Thiéfaine Playlist',
                isOpen: true,
            },
            {
                roomID: datatype.uuid(),
                roomName: 'Muse Playlist',
                isOpen: true,
            },
        ];
        const firstOtherUserMpeRoom = otherUserMpeRooms[0];
        await createAuthenticatedUserAndGetSocket({
            userID: otherUserID,
            mpeRoomIDToAssociate: otherUserMpeRooms,
        });

        const searchQuery = firstOtherUserMpeRoom.roomName.toLowerCase();
        const requestBody: UserSearchMpeRoomsRequestBody = {
            userID: otherUserID,
            searchQuery,
            page: 1,
        };
        const { body } = await request
            .post('/user/search/mpe')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = UserSearchMpeRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(
            parsedBody.data[0].roomName,
            firstOtherUserMpeRoom.roomName,
        );
    });

    test('Page must be strictly positive', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const otherUserID = datatype.uuid();
        await createAuthenticatedUserAndGetSocket({
            userID: otherUserID,
        });

        const requestBody: UserSearchMpeRoomsRequestBody = {
            userID: otherUserID,
            searchQuery: '',
            page: 0,
        };
        await request.post('/user/search/mpe').send(requestBody).expect(500);
    });

    test('Fails when user has set playlists setting visibility as PRIVATE', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const otherUserID = datatype.uuid();
        const privateVisibility = await getVisibilityDatabaseEntry('PRIVATE');
        await User.create({
            uuid: otherUserID,
            nickname: internet.userName(),
            playlistsVisibilitySettingUuid: privateVisibility.uuid,
            email: internet.email(),
            password: internet.password(),
        });

        const requestBody: UserSearchMpeRoomsRequestBody = {
            userID: otherUserID,
            searchQuery: '',
            page: 1,
        };
        await request.post('/user/search/mpe').send(requestBody).expect(403);
    });

    test('Fails when user has set playlists visibility setting as FOLLOWERS_ONLY, and requesting user does not follow her', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const otherUserID = datatype.uuid();
        const privateVisibility = await getVisibilityDatabaseEntry(
            'FOLLOWERS_ONLY',
        );
        await User.create({
            uuid: otherUserID,
            nickname: internet.userName(),
            playlistsVisibilitySettingUuid: privateVisibility.uuid,
            email: internet.email(),
            password: internet.password(),
        });

        const requestBody: UserSearchMpeRoomsRequestBody = {
            userID: otherUserID,
            searchQuery: '',
            page: 1,
        };
        await request.post('/user/search/mpe').send(requestBody).expect(403);
    });

    test("Returns user's MPE rooms who has set playlists visibility setting as FOLLOWERS_ONLY, and requesting user followers her", async (assert) => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);

        const otherUserID = datatype.uuid();
        const privateVisibility = await getVisibilityDatabaseEntry(
            'FOLLOWERS_ONLY',
        );
        const otherUser = await User.create({
            uuid: otherUserID,
            nickname: internet.userName(),
            playlistsVisibilitySettingUuid: privateVisibility.uuid,
            email: internet.email(),
            password: internet.password(),
        });

        await user.related('following').save(otherUser);

        const requestBody: UserSearchMpeRoomsRequestBody = {
            userID: otherUserID,
            searchQuery: '',
            page: 1,
        };
        const { body } = await request
            .post('/user/search/mpe')
            .send(requestBody)
            .expect(200);
        const parsedBody = UserSearchMpeRoomsResponseBody.parse(body);

        assert.equal(parsedBody.totalEntries, 0);
    });
});

test.group('All MPE Rooms Search', (group) => {
    const {
        createAuthenticatedUserAndGetSocket,
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        createRequest,
        createUserAndAuthenticate,
        associateMpeRoomListToUser,
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

    test('Requires authentication', async () => {
        const request = createRequest();

        const requestBody: ListAllMpeRoomsRequestBody = {
            searchQuery: '',
            page: 1,
        };
        await request
            .post('/mpe/search/all-rooms')
            .send(requestBody)
            .expect(401);
    });

    test('Does not return rooms user is member of', async (assert) => {
        const request = createRequest();

        const mpeRooms = generateArray({
            fill: () => ({
                roomName: lorem.sentence(),
                roomID: datatype.uuid(),
            }),
            minLength: 3,
            maxLength: 9,
        });

        const user = await createUserAndAuthenticate(request);
        await associateMpeRoomListToUser({
            user,
            mpeRoomList: mpeRooms,
        });

        const requestBody: ListAllMpeRoomsRequestBody = {
            searchQuery: '',
            page: 1,
        };
        const { body } = await request
            .post('/mpe/search/all-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = ListAllMpeRoomsResponseBody.parse(body);

        assert.isEmpty(parsedBody.data);
        assert.isFalse(parsedBody.hasMore);
        assert.equal(parsedBody.totalEntries, 0);
        assert.equal(parsedBody.page, 1);
    });

    test('Returns only rooms matching partial search query', async (assert) => {
        const request = createRequest();

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

        await createAuthenticatedUserAndGetSocket({
            userID: datatype.uuid(),
            mpeRoomIDToAssociate: mpeRooms,
        });

        await createUserAndAuthenticate(request);

        const searchQuery = firstMpeRoom.roomName.slice(0, 3);
        const requestBody: ListAllMpeRoomsRequestBody = {
            searchQuery,
            page: 1,
        };
        const { body } = await request
            .post('/mpe/search/all-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = ListAllMpeRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(parsedBody.data[0].roomName, firstMpeRoom.roomName);
    });

    test('Returns only rooms matching case insensitive search query', async (assert) => {
        const request = createRequest();

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

        await createAuthenticatedUserAndGetSocket({
            userID: datatype.uuid(),
            mpeRoomIDToAssociate: mpeRooms,
        });

        await createUserAndAuthenticate(request);

        const searchQuery = firstMpeRoom.roomName.toLowerCase();
        const requestBody: ListAllMpeRoomsRequestBody = {
            searchQuery,
            page: 1,
        };
        const { body } = await request
            .post('/mpe/search/all-rooms')
            .send(requestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const parsedBody = ListAllMpeRoomsResponseBody.parse(body);

        assert.equal(parsedBody.data.length, 1);
        assert.equal(parsedBody.data[0].roomName, firstMpeRoom.roomName);
    });

    test('Page must be strictly positive', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const requestBody: ListAllMpeRoomsRequestBody = {
            searchQuery: '',
            page: 0,
        };
        await request
            .post('/mpe/search/all-rooms')
            .send(requestBody)
            .expect(500);
    });

    test('All rooms are paginated', async (assert) => {
        const PAGE_MAX_LENGTH = 10;
        const request = createRequest();

        const mpeRooms = generateArray({
            fill: () => ({
                roomName: lorem.sentence(),
                roomID: datatype.uuid(),
            }),
            minLength: 22,
            maxLength: 36,
        });
        const totalRoomsCount = mpeRooms.length;

        await createAuthenticatedUserAndGetSocket({
            userID: datatype.uuid(),
            mpeRoomIDToAssociate: mpeRooms,
        });

        await createUserAndAuthenticate(request);

        let page = 1;
        let hasMore = true;
        let totalFetchedEntries = 0;
        while (hasMore === true) {
            const requestBody: ListAllMpeRoomsRequestBody = {
                searchQuery: '',
                page,
            };
            const { body: pageBodyRaw } = await request
                .post('/mpe/search/all-rooms')
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(200);
            const pageBodyParsed =
                ListAllMpeRoomsResponseBody.parse(pageBodyRaw);

            assert.equal(pageBodyParsed.page, page);
            assert.equal(pageBodyParsed.totalEntries, totalRoomsCount);
            assert.isAtMost(pageBodyParsed.data.length, PAGE_MAX_LENGTH);

            totalFetchedEntries += pageBodyParsed.data.length;
            hasMore = pageBodyParsed.hasMore;
            page++;
        }

        assert.equal(totalFetchedEntries, totalRoomsCount);

        const extraRequestBody: ListAllMpeRoomsRequestBody = {
            searchQuery: '',
            page,
        };
        const { body: extraPageBodyRaw } = await request
            .post('/mpe/search/all-rooms')
            .send(extraRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const extraPageBodyParsed =
            ListAllMpeRoomsResponseBody.parse(extraPageBodyRaw);

        assert.equal(extraPageBodyParsed.page, page);
        assert.equal(extraPageBodyParsed.totalEntries, totalRoomsCount);
        assert.equal(extraPageBodyParsed.data.length, 0);
        assert.isFalse(extraPageBodyParsed.hasMore);
    });

    test('Rooms should be ordered by private room first, public but invited room in second and then some public rooms', async (assert) => {
        const request = createRequest();

        const PAGE_MAX_LENGTH = 10;
        const inviterUserID = datatype.uuid();

        await createAuthenticatedUserAndGetSocket({
            userID: inviterUserID,
        });

        const user = await createUserAndAuthenticate(request);

        const privateMpeRoomsWithInvitation = await MpeRoom.createMany(
            generateArray({
                fill: () => ({
                    uuid: datatype.uuid(),
                    runID: datatype.uuid(),
                    name: lorem.sentence(),
                    creatorID: inviterUserID,
                    isOpen: false,
                }),
                minLength: 5,
                maxLength: 5,
            }),
        );
        for (const room of privateMpeRoomsWithInvitation) {
            await room.related('invitations').create({
                invitingUserID: inviterUserID,
                invitedUserID: user.uuid,
            });
        }

        const openMpeRoomsWithInvitation = await MpeRoom.createMany(
            generateArray({
                fill: () => ({
                    uuid: datatype.uuid(),
                    runID: datatype.uuid(),
                    name: lorem.sentence(),
                    creatorID: inviterUserID,
                    isOpen: true,
                }),
                minLength: 5,
                maxLength: 5,
            }),
        );
        for (const room of openMpeRoomsWithInvitation) {
            await room.related('invitations').create({
                invitingUserID: inviterUserID,
                invitedUserID: user.uuid,
            });
        }

        const openMpeRoomsWithoutInvitation = await MpeRoom.createMany(
            generateArray({
                fill: () => ({
                    uuid: datatype.uuid(),
                    runID: datatype.uuid(),
                    name: lorem.sentence(),
                    creatorID: inviterUserID,
                    isOpen: true,
                }),
                minLength: 5,
                maxLength: 5,
            }),
        );

        const expectedMpeRoomsIDToBeReturnedInOrder = [
            ...privateMpeRoomsWithInvitation.map((room) => room.uuid).sort(),
            ...openMpeRoomsWithInvitation.map((room) => room.uuid).sort(),
            ...openMpeRoomsWithoutInvitation.map((room) => room.uuid).sort(),
        ];
        const totalRoomsCount = expectedMpeRoomsIDToBeReturnedInOrder.length;

        let page = 1;
        let hasMore = true;
        const fetchedRoomsIDs: string[] = [];
        while (hasMore === true) {
            const requestBody: ListAllMpeRoomsRequestBody = {
                searchQuery: '',
                page,
            };
            const { body: pageBodyRaw } = await request
                .post('/mpe/search/all-rooms')
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(200);
            const pageBodyParsed =
                ListAllMpeRoomsResponseBody.parse(pageBodyRaw);

            assert.equal(pageBodyParsed.page, page);
            assert.equal(pageBodyParsed.totalEntries, totalRoomsCount);
            assert.isAtMost(pageBodyParsed.data.length, PAGE_MAX_LENGTH);

            fetchedRoomsIDs.push(
                ...pageBodyParsed.data.map((room) => room.roomID),
            );
            hasMore = pageBodyParsed.hasMore;
            page++;
        }

        assert.deepEqual(
            fetchedRoomsIDs,
            expectedMpeRoomsIDToBeReturnedInOrder,
        );

        const extraRequestBody: ListAllMpeRoomsRequestBody = {
            searchQuery: '',
            page,
        };
        const { body: extraPageBodyRaw } = await request
            .post('/mpe/search/all-rooms')
            .send(extraRequestBody)
            .expect('Content-Type', /json/)
            .expect(200);
        const extraPageBodyParsed =
            ListAllMpeRoomsResponseBody.parse(extraPageBodyRaw);

        assert.equal(extraPageBodyParsed.page, page);
        assert.equal(extraPageBodyParsed.totalEntries, totalRoomsCount);
        assert.equal(extraPageBodyParsed.data.length, 0);
        assert.isFalse(extraPageBodyParsed.hasMore);
    });
});
