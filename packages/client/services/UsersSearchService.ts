import {
    GetMyProfileInformationRequestBody,
    GetMyProfileInformationResponseBody,
    ListMyFollowersRequestBody,
    ListMyFollowersResponseBody,
    ListMyFollowingRequestBody,
    ListMyFollowingResponseBody,
    ListUserFollowersRequestBody,
    ListUserFollowersResponseBody,
    ListUserFollowingRequestBody,
    ListUserFollowingResponseBody,
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    UserSummary,
} from '@musicroom/types';
import urlcat from 'urlcat';
import redaxios from 'redaxios';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { generateArray, generateUserSummary } from '../tests/data';

export const friends = generateArray({
    minLength: 30,
    maxLength: 39,
    fill: generateUserSummary,
});

interface FetchFriendsArgs {
    page: number;
}

export function fetchFriends({
    page,
}: FetchFriendsArgs): Promise<UserSummary[]> {
    const PAGE_LENGTH = 10;

    return Promise.resolve(
        friends.slice((page - 1) * PAGE_LENGTH, page * PAGE_LENGTH),
    );
}

export async function fetchUsers(
    body: SearchUsersRequestBody,
): Promise<SearchUsersResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/search/users');

    const rawResponse = await redaxios.post(url, body);
    const parsedResponse = SearchUsersResponseBody.parse(rawResponse.data);

    return parsedResponse;
}

export async function getMyProfileInformation(
    body: GetMyProfileInformationRequestBody,
): Promise<GetMyProfileInformationResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/me/profile-information');

    const rawResponse = await redaxios.post(url, body);
    const parsedBody = GetMyProfileInformationResponseBody.parse(
        rawResponse.data,
    );

    return parsedBody;
}

export async function fetchMyFollowers(
    body: ListMyFollowersRequestBody,
): Promise<ListMyFollowersResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/me/search/followers');

    const rawResponse = await redaxios.post(url, body);
    const parsedBody = ListMyFollowersResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function fetchMyFollowing(
    body: ListMyFollowingRequestBody,
): Promise<ListMyFollowingResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/me/search/following');

    const rawResponse = await redaxios.post(url, body);
    const parsedBody = ListMyFollowingResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function fetchUserFollowers(
    body: ListUserFollowersRequestBody,
): Promise<ListUserFollowersResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/user/search/followers');

    const rawResponse = await redaxios.post(url, body);
    const parsedBody = ListUserFollowersResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function fetchUserFollowing(
    body: ListUserFollowingRequestBody,
): Promise<ListUserFollowingResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/user/search/following');

    const rawResponse = await redaxios.post(url, body);
    const parsedBody = ListUserFollowingResponseBody.parse(rawResponse.data);

    return parsedBody;
}
