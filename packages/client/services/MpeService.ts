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
    page: number;
}

export async function fetchLibraryMpeRooms({
    userID,
    searchQuery,
    page,
}: FetchLibraryMpeRoomsArgs): Promise<MpeSearchMyRoomsResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/mpe/search/my-rooms');
    const body: MpeSearchMyRoomsRequestBody = {
        userID,
        searchQuery,
        page,
    };

    const rawResponse = await redaxios.post(url, body);
    const parsedResponse = MpeSearchMyRoomsResponseBody.parse(rawResponse.data);

    return parsedResponse;
}

interface FetchAllMpeRoomsArgs {
    searchQuery: string;
    page: number;
    userID: string;
}

export async function fetchAllMpeRooms({
    searchQuery,
    page,
    userID,
}: FetchAllMpeRoomsArgs): Promise<ListAllMpeRoomsResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/mpe/search/all-rooms');
    const body: ListAllMpeRoomsRequestBody = {
        searchQuery,
        page,
        userID,
    };

    const rawResponse = await redaxios.post(url, body);
    const parsedResponse = ListAllMpeRoomsResponseBody.parse(rawResponse.data);

    return parsedResponse;
}
