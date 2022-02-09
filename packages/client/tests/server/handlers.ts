import {
    FollowUserRequestBody,
    FollowUserResponseBody,
    GetMyProfileInformationRequestBody,
    GetMyProfileInformationResponseBody,
    GetMySettingsRequestBody,
    GetMySettingsResponseBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    ListAllMpeRoomsRequestBody,
    ListAllMpeRoomsResponseBody,
    MpeSearchMyRoomsRequestBody,
    MpeSearchMyRoomsResponseBody,
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
    PlaceAutocompleteResponse,
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    TrackMetadata,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
    UpdatePlaylistsVisibilityRequestBody,
    UpdatePlaylistsVisibilityResponseBody,
    UpdateRelationsVisibilityRequestBody,
    UpdateRelationsVisibilityResponseBody,
} from '@musicroom/types';
import { datatype } from 'faker';
import { rest } from 'msw';
import { SERVER_ENDPOINT } from '../../constants/Endpoints';
import { SearchTracksAPIRawResponse } from '../../services/search-tracks';
import { db } from '../data';

export const handlers = [
    rest.get<undefined, { query: string }, SearchTracksAPIRawResponse>(
        `${SERVER_ENDPOINT}/search/track/:query`,
        (req, res, ctx) => {
            const { query } = req.params;

            const tracks = db.searchableTracks.findMany({
                where: {
                    title: {
                        contains: decodeURIComponent(query),
                    },
                },
            });

            return res(ctx.json(tracks as TrackMetadata[] | undefined));
        },
    ),

    rest.get<undefined, { input: string }, PlaceAutocompleteResponse>(
        `${SERVER_ENDPOINT}/proxy-places-api/*`,
        (req, res, ctx) => {
            const placeQueryEncoded = req.url.searchParams.get('input');
            if (placeQueryEncoded === null) {
                return res(ctx.status(500));
            }
            const placeQuery = decodeURIComponent(placeQueryEncoded);

            const response: PlaceAutocompleteResponse = {
                status: 'OK',
                predictions: [
                    {
                        description: placeQuery,
                        matched_substrings: [],
                        place_id: datatype.uuid(),
                        types: [],
                        structured_formatting: {
                            main_text: '',
                            main_text_matched_substrings: [],
                            secondary_text: '',
                        },
                        terms: [],
                    },
                ],
            };

            return res(ctx.json(response));
        },
    ),

    rest.post<
        MtvRoomSearchRequestBody,
        Record<string, never>,
        MtvRoomSearchResponse
    >(`${SERVER_ENDPOINT}/search/rooms`, (req, res, ctx) => {
        const PAGE_SIZE = 10;
        const { page, searchQuery } = req.body;

        const allRooms = db.searchableRooms.getAll();
        const roomsMatching = allRooms.filter(({ roomName }) =>
            roomName.startsWith(searchQuery),
        );
        const paginatedRooms = roomsMatching.slice(
            (page - 1) * PAGE_SIZE,
            page * PAGE_SIZE,
        );

        return res(
            ctx.json({
                data: paginatedRooms,
                totalEntries: roomsMatching.length,
                hasMore: roomsMatching.length > page * PAGE_SIZE,
                page,
            }),
        );
    }),

    rest.post<
        SearchUsersRequestBody,
        Record<string, never>,
        SearchUsersResponseBody
    >(`${SERVER_ENDPOINT}/search/users`, (req, res, ctx) => {
        const PAGE_SIZE = 10;
        const { page, searchQuery } = req.body;

        if (searchQuery === '') {
            return res(ctx.status(400));
        }

        const allUsers = db.searchableUsers.getAll();
        const usersMatching = allUsers.filter(({ nickname }) =>
            nickname.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        const paginatedUsers = usersMatching.slice(
            (page - 1) * PAGE_SIZE,
            page * PAGE_SIZE,
        );

        return res(
            ctx.json({
                data: paginatedUsers,
                totalEntries: usersMatching.length,
                hasMore: usersMatching.length > page * PAGE_SIZE,
                page,
            }),
        );
    }),

    rest.post<
        ListAllMpeRoomsRequestBody,
        Record<string, never>,
        ListAllMpeRoomsResponseBody
    >(`${SERVER_ENDPOINT}/mpe/search/all-rooms`, (req, res, ctx) => {
        const PAGE_SIZE = 10;
        const { page, searchQuery } = req.body;

        const allRooms = db.searchableMpeRooms.getAll();
        const roomsMatching = allRooms.filter(({ roomName }) =>
            roomName.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        const paginatedRooms = roomsMatching.slice(
            (page - 1) * PAGE_SIZE,
            page * PAGE_SIZE,
        );

        return res(
            ctx.json({
                data: paginatedRooms,
                totalEntries: roomsMatching.length,
                hasMore: roomsMatching.length > page * PAGE_SIZE,
                page,
            }),
        );
    }),

    rest.post<
        GetUserProfileInformationRequestBody,
        Record<string, never>,
        GetUserProfileInformationResponseBody
    >(`${SERVER_ENDPOINT}/user/profile-information`, async (req, res, ctx) => {
        const { userID } = req.body;

        const user = db.userProfileInformation.findFirst({
            where: {
                userID: {
                    equals: userID,
                },
            },
        });

        if (user === null) {
            return res(ctx.status(404));
        }

        return res(
            ctx.json({
                ...user,
                followersCounter: user.followersCounter || undefined,
                followingCounter: user.followingCounter || undefined,
                playlistsCounter: user.playlistsCounter || undefined,
            }),
        );
    }),

    rest.post<
        GetMyProfileInformationRequestBody,
        Record<string, never>,
        GetMyProfileInformationResponseBody
    >(
        `${SERVER_ENDPOINT}/user/my-profile-information`,
        async (req, res, ctx) => {
            const { tmpAuthUserID } = req.body;

            const user = db.myProfileInformation.findFirst({
                where: {
                    userID: {
                        equals: tmpAuthUserID,
                    },
                },
            });

            if (user === null) {
                return res(ctx.status(404));
            }

            return res(
                ctx.json({
                    userID: user.userID,
                    userNickname: user.userNickname,
                    playlistsCounter: user.playlistsCounter,
                    followersCounter: user.followersCounter,
                    followingCounter: user.followingCounter,
                    devicesCounter: user.devicesCounter,
                }),
            );
        },
    ),

    rest.post<
        FollowUserRequestBody,
        Record<string, never>,
        FollowUserResponseBody
    >(`${SERVER_ENDPOINT}/user/follow`, async (req, res, ctx) => {
        const { userID } = req.body;

        const user = db.userProfileInformation.findFirst({
            where: {
                userID: {
                    equals: userID,
                },
            },
        });

        if (user === null) {
            return res(ctx.status(404));
        }

        return res(
            ctx.json({
                userProfileInformation: {
                    ...user,
                    followersCounter: user.followersCounter || undefined,
                    followingCounter: user.followingCounter || undefined,
                    playlistsCounter: user.playlistsCounter || undefined,
                    following: true,
                },
            }),
        );
    }),

    rest.post<
        UnfollowUserRequestBody,
        Record<string, never>,
        UnfollowUserResponseBody
    >(`${SERVER_ENDPOINT}/user/unfollow`, async (req, res, ctx) => {
        const { userID } = req.body;
        console.log('UNFOLLOW');
        const user = db.userProfileInformation.findFirst({
            where: {
                userID: {
                    equals: userID,
                },
            },
        });

        if (user === null) {
            return res(ctx.status(404));
        }

        return res(
            ctx.json({
                userProfileInformation: {
                    ...user,
                    followersCounter: user.followersCounter || undefined,
                    followingCounter: user.followingCounter || undefined,
                    playlistsCounter: user.playlistsCounter || undefined,
                    following: false,
                },
            }),
        );
    }),

    //Normally we should be filtering on mpe room user has joined
    //Atm we don't maintain or have any kind of users list in the client db mock
    rest.post<
        MpeSearchMyRoomsRequestBody,
        Record<string, never>,
        MpeSearchMyRoomsResponseBody
    >(`${SERVER_ENDPOINT}/mpe/search/my-rooms`, (req, res, ctx) => {
        const PAGE_SIZE = 10;
        const { page, searchQuery } = req.body;

        const allRooms = db.searchableMpeRooms.getAll();
        const roomsMatching = allRooms.filter(({ roomName }) =>
            roomName.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        const paginatedRooms = roomsMatching.slice(
            (page - 1) * PAGE_SIZE,
            page * PAGE_SIZE,
        );

        return res(
            ctx.json({
                data: paginatedRooms,
                totalEntries: roomsMatching.length,
                hasMore: roomsMatching.length > page * PAGE_SIZE,
                page,
            }),
        );
    }),

    rest.post<
        GetMySettingsRequestBody,
        Record<string, never>,
        GetMySettingsResponseBody
    >(`${SERVER_ENDPOINT}/me/settings`, (req, res, ctx) => {
        const user = db.myProfileInformation.findFirst({
            where: {
                userID: {
                    equals: req.body.tmpAuthUserID,
                },
            },
        });
        if (user === null) {
            return res(ctx.status(404));
        }

        return res(
            ctx.json({
                nickname: user.userNickname,
                playlistsVisibilitySetting: user.playlistsVisibilitySetting,
                relationsVisibilitySetting: user.relationsVisibilitySetting,
            }),
        );
    }),

    rest.post<
        UpdatePlaylistsVisibilityRequestBody,
        Record<string, never>,
        UpdatePlaylistsVisibilityResponseBody
    >(`${SERVER_ENDPOINT}/me/playlists-visibility`, (req, res, ctx) => {
        db.myProfileInformation.update({
            where: {
                userID: {
                    equals: req.body.tmpAuthUserID,
                },
            },
            data: {
                playlistsVisibilitySetting: req.body.visibility,
            },
        });

        return res(
            ctx.json({
                status: 'SUCCESS',
            }),
        );
    }),

    rest.post<
        UpdateRelationsVisibilityRequestBody,
        Record<string, never>,
        UpdateRelationsVisibilityResponseBody
    >(`${SERVER_ENDPOINT}/me/relations-visibility`, (req, res, ctx) => {
        db.myProfileInformation.update({
            where: {
                userID: {
                    equals: req.body.tmpAuthUserID,
                },
            },
            data: {
                relationsVisibilitySetting: req.body.visibility,
            },
        });

        return res(
            ctx.json({
                status: 'SUCCESS',
            }),
        );
    }),
];
