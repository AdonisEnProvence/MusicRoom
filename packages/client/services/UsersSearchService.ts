import {
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
} from '@musicroom/types';
import { request } from './http';

export async function fetchUsers(
    body: SearchUsersRequestBody,
): Promise<SearchUsersResponseBody> {
    const rawResponse = await request.post('/search/users', body);
    const parsedResponse = SearchUsersResponseBody.parse(rawResponse.data);

    return parsedResponse;
}

export async function getMyProfileInformation(): Promise<GetMyProfileInformationResponseBody> {
    const rawResponse = await request.get('/me/profile-information');
    const parsedBody = GetMyProfileInformationResponseBody.parse(
        rawResponse.data,
    );

    return parsedBody;
}

export async function fetchMyFollowers(
    body: ListMyFollowersRequestBody,
): Promise<ListMyFollowersResponseBody> {
    const rawResponse = await request.post('/me/search/followers', body);
    const parsedBody = ListMyFollowersResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function fetchMyFollowing(
    body: ListMyFollowingRequestBody,
): Promise<ListMyFollowingResponseBody> {
    const rawResponse = await request.post('/me/search/following', body);
    const parsedBody = ListMyFollowingResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function fetchUserFollowers(
    body: ListUserFollowersRequestBody,
): Promise<ListUserFollowersResponseBody> {
    const rawResponse = await request.post('/user/search/followers', body);
    const parsedBody = ListUserFollowersResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function fetchUserFollowing(
    body: ListUserFollowingRequestBody,
): Promise<ListUserFollowingResponseBody> {
    const rawResponse = await request.post('/user/search/following', body);
    const parsedBody = ListUserFollowingResponseBody.parse(rawResponse.data);

    return parsedBody;
}
