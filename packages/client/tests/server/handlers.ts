import { readFile } from 'fs/promises';
import { join } from 'path';
import {
    FollowUserRequestBody,
    FollowUserResponseBody,
    GetMyProfileInformationResponseBody,
    GetMySettingsResponseBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    ListAllMpeRoomsRequestBody,
    ListAllMpeRoomsResponseBody,
    ListMyFollowersRequestBody,
    ListMyFollowersResponseBody,
    ListMyFollowingRequestBody,
    ListUserFollowersRequestBody,
    ListUserFollowersResponseBody,
    ListUserFollowingRequestBody,
    ListUserFollowingResponseBody,
    MpeSearchMyRoomsRequestBody,
    MpeSearchMyRoomsResponseBody,
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
    passwordStrengthRegex,
    PlaceAutocompleteResponse,
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    SignUpFailureReasons,
    SignUpRequestBody,
    SignUpResponseBody,
    SignInRequestBody,
    SignInResponseBody,
    TrackMetadata,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
    UpdatePlaylistsVisibilityRequestBody,
    UpdatePlaylistsVisibilityResponseBody,
    UpdateRelationsVisibilityRequestBody,
    UpdateRelationsVisibilityResponseBody,
    UserSearchMpeRoomsRequestBody,
    UserSearchMpeRoomsResponseBody,
    ConfirmEmailRequestBody,
    ConfirmEmailResponseBody,
    SignOutResponseBody,
    ResendConfirmationEmailResponseBody,
    RequestPasswordResetRequestBody,
    RequestPasswordResetResponseBody,
    ValidatePasswordResetTokenRequestBody,
    ValidatePasswordResetTokenResponseBody,
    AuthenticateWithGoogleOauthRequestBody,
    AuthenticateWithGoogleOauthResponseBody,
    ResetPasswordRequestBody,
    ResetPasswordResponseBody,
    LinkGoogleAccountRequestBody,
    LinkGoogleAccountResponseBody,
} from '@musicroom/types';
import { datatype, internet } from 'faker';
import {
    DefaultRequestBody,
    PathParams,
    ResponseResolver,
    rest,
    RestContext,
    RestRequest,
} from 'msw';
import * as z from 'zod';
import {
    AuthSessionResult,
    TokenResponse,
    TokenResponseConfig,
} from 'expo-auth-session';
import { data } from 'msw/lib/types/context';
import { SERVER_ENDPOINT } from '../../constants/Endpoints';
import { SearchTracksAPIRawResponse } from '../../services/search-tracks';
import { db } from '../data';
import { CLIENT_INTEG_TEST_USER_ID } from '../tests-utils';

export function withAuthentication<
    RequestBody extends DefaultRequestBody,
    Params extends PathParams,
    ResponseBody extends DefaultRequestBody,
>(
    handler: ResponseResolver<
        RestRequest<RequestBody, Params>,
        RestContext,
        ResponseBody
    >,
): ResponseResolver<
    RestRequest<RequestBody, Params>,
    RestContext,
    ResponseBody
> {
    return (req, res, ctx) => {
        const authenticationToken = req.headers.get('authorization');
        if (authenticationToken === null) {
            return res(ctx.status(401));
        }

        return handler(req, res, ctx);
    };
}

export const handlers = [
    rest.get<undefined, { query: string }, SearchTracksAPIRawResponse>(
        `${SERVER_ENDPOINT}/search/track/:query`,
        withAuthentication((req, res, ctx) => {
            const { query } = req.params;

            const tracks = db.searchableTracks.findMany({
                where: {
                    title: {
                        contains: decodeURIComponent(query),
                    },
                },
            });

            return res(ctx.json(tracks as TrackMetadata[] | undefined));
        }),
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
    >(
        `${SERVER_ENDPOINT}/search/rooms`,
        withAuthentication((req, res, ctx) => {
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
    ),

    rest.post<
        SearchUsersRequestBody,
        Record<string, never>,
        SearchUsersResponseBody
    >(
        `${SERVER_ENDPOINT}/search/users`,
        withAuthentication((req, res, ctx) => {
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
    ),

    rest.post<
        ListAllMpeRoomsRequestBody,
        Record<string, never>,
        ListAllMpeRoomsResponseBody
    >(
        `${SERVER_ENDPOINT}/mpe/search/all-rooms`,
        withAuthentication((req, res, ctx) => {
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
    ),

    rest.post<
        GetUserProfileInformationRequestBody,
        Record<string, never>,
        GetUserProfileInformationResponseBody
    >(
        `${SERVER_ENDPOINT}/user/profile-information`,
        withAuthentication((req, res, ctx) => {
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

            const {
                userNickname,
                following,
                followersCounter,
                followingCounter,
                playlistsCounter,
            } = user;

            return res(
                ctx.json({
                    userID,
                    userNickname,
                    following,
                    followersCounter: followersCounter ?? undefined,
                    followingCounter: followingCounter ?? undefined,
                    playlistsCounter: playlistsCounter ?? undefined,
                }),
            );
        }),
    ),

    rest.get<never, never, GetMyProfileInformationResponseBody>(
        `${SERVER_ENDPOINT}/me/profile-information`,
        withAuthentication((_req, res, ctx) => {
            const user = db.myProfileInformation.findFirst({
                where: {
                    userID: {
                        equals: CLIENT_INTEG_TEST_USER_ID,
                    },
                },
            });
            if (user === null) {
                return res(ctx.status(404));
            }

            const hasVerifiedAccount = user.hasConfirmedEmail || user.googleID;
            return res(
                ctx.json({
                    userID: user.userID,
                    userNickname: user.userNickname,
                    playlistsCounter: user.playlistsCounter,
                    followersCounter: user.followersCounter,
                    followingCounter: user.followingCounter,
                    devicesCounter: user.devicesCounter,
                    hasVerifiedAccount,
                }),
            );
        }),
    ),

    rest.post<
        FollowUserRequestBody,
        Record<string, never>,
        FollowUserResponseBody
    >(
        `${SERVER_ENDPOINT}/user/follow`,
        withAuthentication((req, res, ctx) => {
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
    ),

    rest.post<
        UnfollowUserRequestBody,
        Record<string, never>,
        UnfollowUserResponseBody
    >(
        `${SERVER_ENDPOINT}/user/unfollow`,
        withAuthentication((req, res, ctx) => {
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
    ),

    //Normally we should be filtering on mpe room user has joined
    //Atm we don't maintain or have any kind of users list in the client db mock
    rest.post<
        MpeSearchMyRoomsRequestBody,
        Record<string, never>,
        MpeSearchMyRoomsResponseBody
    >(
        `${SERVER_ENDPOINT}/mpe/search/my-rooms`,
        withAuthentication((req, res, ctx) => {
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
    ),

    rest.get<never, never, GetMySettingsResponseBody>(
        `${SERVER_ENDPOINT}/me/settings`,
        withAuthentication((_req, res, ctx) => {
            const user = db.myProfileInformation.findFirst({
                where: {
                    userID: {
                        equals: CLIENT_INTEG_TEST_USER_ID,
                    },
                },
            });
            if (user === null) {
                return res(ctx.status(404));
            }

            const hasLinkedGoogleAccount = user.googleID;
            return res(
                ctx.json({
                    nickname: user.userNickname,
                    playlistsVisibilitySetting: user.playlistsVisibilitySetting,
                    relationsVisibilitySetting: user.relationsVisibilitySetting,
                    hasLinkedGoogleAccount,
                }),
            );
        }),
    ),

    rest.post<
        UpdatePlaylistsVisibilityRequestBody,
        never,
        UpdatePlaylistsVisibilityResponseBody
    >(
        `${SERVER_ENDPOINT}/me/playlists-visibility`,
        withAuthentication((req, res, ctx) => {
            db.myProfileInformation.update({
                where: {
                    userID: {
                        equals: CLIENT_INTEG_TEST_USER_ID,
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
    ),

    rest.post<
        UpdateRelationsVisibilityRequestBody,
        never,
        UpdateRelationsVisibilityResponseBody
    >(
        `${SERVER_ENDPOINT}/me/relations-visibility`,
        withAuthentication((req, res, ctx) => {
            db.myProfileInformation.update({
                where: {
                    userID: {
                        equals: CLIENT_INTEG_TEST_USER_ID,
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
    ),

    rest.post<
        UserSearchMpeRoomsRequestBody,
        Record<string, never>,
        UserSearchMpeRoomsResponseBody
    >(
        `${SERVER_ENDPOINT}/user/search/mpe`,
        withAuthentication((req, res, ctx) => {
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
    ),

    rest.post<
        ListUserFollowersRequestBody,
        Record<string, never>,
        ListUserFollowersResponseBody
    >(
        `${SERVER_ENDPOINT}/user/search/followers`,
        withAuthentication((req, res, ctx) => {
            const PAGE_SIZE = 10;
            const { page, searchQuery, userID } = req.body;

            const userFollowers = db.userFollowers.findFirst({
                where: {
                    userID: {
                        equals: userID,
                    },
                },
            });

            if (
                userFollowers === null ||
                userFollowers.followers === undefined
            ) {
                return res(ctx.status(404));
            }
            const filteredUserFollowers = userFollowers.followers.filter(
                (user) =>
                    user.nickname
                        .toLowerCase()
                        .startsWith(searchQuery.toLowerCase()),
            );

            const paginatedFollowers = filteredUserFollowers.slice(
                (page - 1) * PAGE_SIZE,
                page * PAGE_SIZE,
            );

            console.log({ paginatedFollowers });
            return res(
                ctx.json({
                    data: paginatedFollowers,
                    totalEntries: filteredUserFollowers.length,
                    hasMore: filteredUserFollowers.length > page * PAGE_SIZE,
                    page,
                }),
            );
        }),
    ),

    rest.post<
        ListMyFollowersRequestBody,
        Record<string, never>,
        ListMyFollowersResponseBody
    >(
        `${SERVER_ENDPOINT}/me/search/followers`,
        withAuthentication((req, res, ctx) => {
            const PAGE_SIZE = 10;
            const { page, searchQuery } = req.body;

            const userFollowers = db.userFollowers.findFirst({
                where: {
                    userID: {
                        equals: CLIENT_INTEG_TEST_USER_ID,
                    },
                },
            });

            if (
                userFollowers === null ||
                userFollowers.followers === undefined
            ) {
                return res(ctx.status(404));
            }
            const filteredUserFollowers = userFollowers.followers.filter(
                (user) =>
                    user.nickname
                        .toLowerCase()
                        .startsWith(searchQuery.toLowerCase()),
            );

            const paginatedFollowers = filteredUserFollowers.slice(
                (page - 1) * PAGE_SIZE,
                page * PAGE_SIZE,
            );

            return res(
                ctx.json({
                    data: paginatedFollowers,
                    totalEntries: filteredUserFollowers.length,
                    hasMore: filteredUserFollowers.length > page * PAGE_SIZE,
                    page,
                }),
            );
        }),
    ),

    rest.post<
        ListUserFollowingRequestBody,
        Record<string, never>,
        ListUserFollowingResponseBody
    >(
        `${SERVER_ENDPOINT}/user/search/following`,
        withAuthentication((req, res, ctx) => {
            const PAGE_SIZE = 10;
            const { page, searchQuery } = req.body;

            const userFollowing = db.userFollowing.findFirst({
                where: {
                    userID: {
                        equals: req.body.userID,
                    },
                },
            });

            if (
                userFollowing === null ||
                userFollowing.following === undefined
            ) {
                return res(ctx.status(404));
            }

            const filteredUserFollowing = userFollowing.following.filter(
                (user) =>
                    user.nickname
                        .toLowerCase()
                        .startsWith(searchQuery.toLowerCase()),
            );

            const paginatedFollowing = filteredUserFollowing.slice(
                (page - 1) * PAGE_SIZE,
                page * PAGE_SIZE,
            );

            return res(
                ctx.json({
                    data: paginatedFollowing,
                    totalEntries: filteredUserFollowing.length,
                    hasMore: filteredUserFollowing.length > page * PAGE_SIZE,
                    page,
                }),
            );
        }),
    ),

    rest.post<ListMyFollowingRequestBody, never, ListMyFollowersResponseBody>(
        `${SERVER_ENDPOINT}/me/search/following`,
        withAuthentication((req, res, ctx) => {
            const PAGE_SIZE = 10;
            const { page, searchQuery } = req.body;

            const userFollowing = db.userFollowing.findFirst({
                where: {
                    userID: {
                        equals: CLIENT_INTEG_TEST_USER_ID,
                    },
                },
            });

            if (
                userFollowing === null ||
                userFollowing.following === undefined
            ) {
                return res(ctx.status(404));
            }

            const filteredUserFollowing = userFollowing.following.filter(
                (user) =>
                    user.nickname
                        .toLowerCase()
                        .startsWith(searchQuery.toLowerCase()),
            );

            const paginatedFollowing = filteredUserFollowing.slice(
                (page - 1) * PAGE_SIZE,
                page * PAGE_SIZE,
            );

            return res(
                ctx.json({
                    data: paginatedFollowing,
                    totalEntries: filteredUserFollowing.length,
                    hasMore: filteredUserFollowing.length > page * PAGE_SIZE,
                    page,
                }),
            );
        }),
    ),

    rest.post<SignUpRequestBody, Record<string, never>, SignUpResponseBody>(
        `${SERVER_ENDPOINT}/authentication/sign-up`,
        (req, res, ctx) => {
            const signUpFailureReasonCollection: SignUpFailureReasons[] = [];
            const { authenticationMode, email, password, userNickname } =
                req.body;

            const emailIsInvalid =
                z.string().max(255).email().safeParse(email).success === false;
            if (emailIsInvalid) {
                signUpFailureReasonCollection.push('INVALID_EMAIL');
            }

            const userWithSameNickname = db.authenticationUser.findFirst({
                where: {
                    nickname: {
                        equals: userNickname,
                    },
                },
            });
            if (userWithSameNickname) {
                signUpFailureReasonCollection.push('UNAVAILABLE_NICKNAME');
            }

            const userWithSameEmail = db.authenticationUser.findFirst({
                where: {
                    email: {
                        equals: email,
                    },
                },
            });
            if (userWithSameEmail) {
                signUpFailureReasonCollection.push('UNAVAILABLE_EMAIL');
            }

            if (!passwordStrengthRegex.test(password)) {
                signUpFailureReasonCollection.push('WEAK_PASSWORD');
            }

            if (signUpFailureReasonCollection.length > 0) {
                return res(
                    ctx.status(400),
                    ctx.json({
                        signUpFailureReasonCollection,
                        status: 'FAILURE',
                    }),
                );
            }

            const userID = datatype.uuid();
            db.authenticationUser.create({
                uuid: userID,
                email,
                password,
                nickname: userNickname,
            });

            const isApiTokenAuthentication = authenticationMode === 'api';
            return res(
                ctx.status(200),
                ctx.json({
                    status: 'SUCCESS',
                    userSummary: {
                        nickname: userNickname,
                        userID,
                    },
                    token: isApiTokenAuthentication
                        ? datatype.uuid()
                        : undefined,
                }),
            );
        },
    ),

    rest.get(
        'https://avatars.dicebear.com/api/big-smile/:seed.svg',
        async (_req, res, ctx) => {
            const defaultUserAvatar = await readFile(
                join(__dirname, './user-avatar.svg'),
                'utf8',
            );

            return res(
                ctx.set({
                    'content-type': 'image/svg+xml',
                }),
                ctx.body(defaultUserAvatar),
            );
        },
    ),

    rest.post<SignInRequestBody, never, SignInResponseBody>(
        `${SERVER_ENDPOINT}/authentication/sign-in`,
        (req, res, ctx) => {
            const user = db.authenticationUser.findFirst({
                where: {
                    email: {
                        equals: req.body.email,
                    },
                },
            });
            if (user === null) {
                return res(
                    ctx.status(401),
                    ctx.json({
                        status: 'INVALID_CREDENTIALS',
                    }),
                );
            }

            const isInvalidPassword = req.body.password !== user.password;
            if (isInvalidPassword === true) {
                return res(
                    ctx.status(401),
                    ctx.json({
                        status: 'INVALID_CREDENTIALS',
                    }),
                );
            }

            return res(
                ctx.status(200),
                ctx.json({
                    status: 'SUCCESS',
                    token: 'token',
                    userSummary: {
                        nickname: '',
                        userID: user.uuid,
                    },
                }),
            );
        },
    ),

    rest.post<ConfirmEmailRequestBody, never, ConfirmEmailResponseBody>(
        `${SERVER_ENDPOINT}/authentication/confirm-email`,
        withAuthentication((req, res, ctx) => {
            const isConfirmationCodeValid = req.body.token === '123456';
            if (isConfirmationCodeValid === false) {
                return res(
                    ctx.status(400),
                    ctx.json({
                        status: 'INVALID_TOKEN',
                    }),
                );
            }

            db.myProfileInformation.update({
                where: {
                    userID: {
                        equals: CLIENT_INTEG_TEST_USER_ID,
                    },
                },
                data: {
                    hasConfirmedEmail: true,
                },
            });

            return res(
                ctx.status(200),
                ctx.json({
                    status: 'SUCCESS',
                }),
            );
        }),
    ),

    rest.post<never, never, ResendConfirmationEmailResponseBody>(
        `${SERVER_ENDPOINT}/authentication/resend-confirmation-email`,
        withAuthentication((_req, res, ctx) => {
            return res(
                ctx.status(200),
                ctx.json({
                    status: 'SUCCESS',
                }),
            );
        }),
    ),

    rest.post<never, never, SignOutResponseBody>(
        `${SERVER_ENDPOINT}/authentication/sign-out`,
        withAuthentication((_req, res, ctx) => {
            return res(
                ctx.json({
                    status: 'SUCCESS',
                }),
            );
        }),
    ),

    rest.post<
        RequestPasswordResetRequestBody,
        never,
        RequestPasswordResetResponseBody
    >(
        `${SERVER_ENDPOINT}/authentication/request-password-reset`,
        (req, res, ctx) => {
            const user = db.authenticationUser.findFirst({
                where: {
                    email: {
                        equals: req.body.email,
                    },
                },
            });
            if (user === null) {
                return res(
                    ctx.status(404),
                    ctx.json({
                        status: 'INVALID_EMAIL',
                    }),
                );
            }

            return res(
                ctx.status(200),
                ctx.json({
                    status: 'SUCCESS',
                }),
            );
        },
    ),

    rest.post<
        ValidatePasswordResetTokenRequestBody,
        never,
        ValidatePasswordResetTokenResponseBody
    >(
        `${SERVER_ENDPOINT}/authentication/validate-password-reset-token`,
        (req, res, ctx) => {
            const user = db.authenticationUser.findFirst({
                where: {
                    email: {
                        equals: req.body.email,
                    },
                },
            });
            if (user === null) {
                return res(
                    ctx.status(404),
                    ctx.json({
                        status: 'INVALID_TOKEN',
                    }),
                );
            }

            const isValidCode = req.body.token === '123456';
            const isInvalidCode = isValidCode === false;
            if (isInvalidCode === true) {
                return res(
                    ctx.status(400),
                    ctx.json({
                        status: 'INVALID_TOKEN',
                    }),
                );
            }

            return res(
                ctx.json({
                    status: 'SUCCESS',
                }),
                ctx.status(200),
            );
        },
    ),

    rest.post<
        AuthenticateWithGoogleOauthRequestBody,
        never,
        AuthenticateWithGoogleOauthResponseBody
    >(
        `${SERVER_ENDPOINT}/authentication/authenticate-with-google-oauth`,
        (req, res, ctx) => {
            const { authenticationMode } = req.body;

            //In this handler we do not care if the user will in fact perform a sign up or a sign in
            db.authenticationUser.create({
                uuid: CLIENT_INTEG_TEST_USER_ID,
                email: internet.email(),
                password: internet.password(),
                nickname: internet.userName(),
            });

            db.myProfileInformation.update({
                data: {
                    googleID: true,
                },
                where: {
                    userID: {
                        equals: CLIENT_INTEG_TEST_USER_ID,
                    },
                },
            });

            const isApiTokenAuthentication = authenticationMode === 'api';
            return res(
                ctx.status(200),
                ctx.json({
                    status: 'SUCCESS',
                    token: isApiTokenAuthentication ? 'token' : undefined,
                }),
            );
        },
    ),

    rest.get<never, never, AuthSessionResult>(
        `http://msw.google.domain/fake-google-oauth-service`,
        (_req, res, ctx) => {
            const tokenResponseConfig: TokenResponseConfig = {
                accessToken: datatype.uuid(),
            };
            const authentication = new TokenResponse(tokenResponseConfig);

            return res(
                ctx.status(200),
                ctx.json({
                    type: 'success',
                    errorCode: null,
                    authentication,
                    params: {},
                    url: '',
                    error: undefined,
                }),
            );
        },
    ),

    rest.post<ResetPasswordRequestBody, never, ResetPasswordResponseBody>(
        `${SERVER_ENDPOINT}/authentication/reset-password`,
        (req, res, ctx) => {
            const user = db.authenticationUser.findFirst({
                where: {
                    email: {
                        equals: req.body.email,
                    },
                },
            });
            if (user === null) {
                return res(
                    ctx.status(400),
                    ctx.json({
                        status: 'INVALID_TOKEN',
                    }),
                );
            }

            const isValidCode = req.body.token === '123456';
            const isInvalidCode = isValidCode === false;
            if (isInvalidCode === true) {
                return res(
                    ctx.status(400),
                    ctx.json({
                        status: 'INVALID_TOKEN',
                    }),
                );
            }

            /**
             * Current password copy-pasted from packages/client/screens/PasswordResetFinalScreen.tsx
             */
            const isSamePassword =
                req.body.password === 'MusicRoom is awesome!';
            if (isSamePassword === true) {
                return res(
                    ctx.status(400),
                    ctx.json({
                        status: 'PASSWORD_ALREADY_USED',
                    }),
                );
            }

            return res(
                ctx.status(200),
                ctx.json({
                    status: 'SUCCESS',
                    token: 'token',
                }),
            );
        },
    ),

    rest.post<
        LinkGoogleAccountRequestBody,
        never,
        LinkGoogleAccountResponseBody
    >(`${SERVER_ENDPOINT}/me/link-google-account`, (_req, res, ctx) => {
        db.myProfileInformation.update({
            where: {
                userID: {
                    equals: CLIENT_INTEG_TEST_USER_ID,
                },
            },
            data: {
                googleID: true,
            },
        });

        return res(
            ctx.status(200),
            ctx.json({
                status: 'SUCCESS',
            }),
        );
    }),
    //
];
