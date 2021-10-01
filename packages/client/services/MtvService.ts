import {
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
} from '@musicroom/types';
import urlcat from 'urlcat';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export async function fetchMtvRooms(
    body: MtvRoomSearchRequestBody,
): Promise<MtvRoomSearchResponse> {
    const url = urlcat(SERVER_ENDPOINT, '/v2/search/rooms');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (response.ok === false) {
        console.error(response.status, response.statusText);
        throw new Error('Could not get rooms');
    }

    const rawResponse = await response.json();
    const parsedResponse = MtvRoomSearchResponse.parse(rawResponse);

    return parsedResponse;
}
