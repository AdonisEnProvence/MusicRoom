import {
    MpeSearchMyRoomsRequestBody,
    MpeSearchMyRoomsResponseBody,
    ListAllMpeRoomsResponseBody,
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

    const rawResponse = await redaxios.post(url, {
        userID,
    });
    const parsedResponse = ListAllMpeRoomsResponseBody.parse(rawResponse.data);

    return parsedResponse;
}
