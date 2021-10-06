import {
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
} from '@musicroom/types';
import urlcat from 'urlcat';
import redaxios from 'redaxios';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export async function fetchMtvRooms(
    body: MtvRoomSearchRequestBody,
): Promise<MtvRoomSearchResponse> {
    const url = urlcat(SERVER_ENDPOINT, '/search/rooms');

    const rawResponse = await redaxios.post(url, body);
    const parsedResponse = MtvRoomSearchResponse.parse(rawResponse.data);

    return parsedResponse;
}
