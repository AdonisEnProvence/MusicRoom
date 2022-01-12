import {
    MpeSearchMyRoomsRequestBody,
    MpeSearchMyRoomsResponseBody,
    ListAllMpeRoomsResponseBody,
    ListAllMpeRoomsRequestBody,
} from '@musicroom/types';
import urlcat from 'urlcat';
import redaxios from 'redaxios';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

interface FetchLibraryMpeRoomsArgs {
    userID: string;
    searchQuery: string;
}

export async function fetchLibraryMpeRooms({
    userID,
    searchQuery,
}: FetchLibraryMpeRoomsArgs): Promise<MpeSearchMyRoomsResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/mpe/search/my-rooms');
    const body: MpeSearchMyRoomsRequestBody = {
        userID,
        searchQuery,
        page: 1,
    };

    const rawResponse = await redaxios.post(url, body);
    const parsedResponse = MpeSearchMyRoomsResponseBody.parse(rawResponse.data);

    return parsedResponse;
}

interface FetchAllMpeRoomsArgs {
    userID: string;
    searchQuery: string;
}

export async function fetchAllMpeRooms({
    userID,
    searchQuery,
}: FetchAllMpeRoomsArgs): Promise<ListAllMpeRoomsResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/mpe/search/all-rooms');
    const body: ListAllMpeRoomsRequestBody = {
        searchQuery,
        page: 1,
    };

    const rawResponse = await redaxios.post(url, body);
    const parsedResponse = ListAllMpeRoomsResponseBody.parse(rawResponse.data);

    return parsedResponse;
}
