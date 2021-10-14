import {
    SearchUsersRequestBody,
    SearchUsersResponseBody,
} from '@musicroom/types';
import urlcat from 'urlcat';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import redaxios from 'redaxios';

export async function fetchUsers(
    body: SearchUsersRequestBody,
): Promise<SearchUsersResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/search/users');

    const rawResponse = await redaxios.post(url, body);
    const parsedResponse = SearchUsersResponseBody.parse(rawResponse.data);

    return parsedResponse;
}
