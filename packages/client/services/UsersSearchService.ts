import {
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    UserSummary,
} from '@musicroom/types';
import urlcat from 'urlcat';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import redaxios from 'redaxios';
import { generateArray, generateUserSummary } from '../tests/data';
import { datatype } from 'faker';

export const friends = generateArray(
    datatype.number({
        min: 30,
        max: 39,
    }),
    generateUserSummary,
);

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
