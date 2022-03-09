import {
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
} from '@musicroom/types';
import { request } from './http';

export async function fetchMtvRooms(
    body: MtvRoomSearchRequestBody,
): Promise<MtvRoomSearchResponse> {
    const rawResponse = await request.post('/search/rooms', body);
    const parsedResponse = MtvRoomSearchResponse.parse(rawResponse.data);

    return parsedResponse;
}
