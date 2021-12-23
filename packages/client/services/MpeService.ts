import {
    LibraryMpeRoomSearchResponseBody,
    MtvRoomSearchRequestBody,
} from '@musicroom/types';
import urlcat from 'urlcat';
import redaxios from 'redaxios';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export async function fetchLibraryMpeRooms({
    userID,
}: {
    userID: string;
}): Promise<LibraryMpeRoomSearchResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/mpe/search/user-rooms');

    const rawResponse = await redaxios.post(url, {
        userID,
    });
    const parsedResponse = LibraryMpeRoomSearchResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponse;
}

export async function fetchAllMpeRooms({
    userID,
}: {
    userID: string;
}): Promise<LibraryMpeRoomSearchResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/mpe/search/all-rooms');

    const rawResponse = await redaxios.post(url, {
        userID,
    });
    const parsedResponse = LibraryMpeRoomSearchResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponse;
}
