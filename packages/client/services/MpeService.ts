import {
    MpeSearchMyRoomsRequestBody,
    MpeSearchMyRoomsResponseBody,
    ListAllMpeRoomsResponseBody,
    ListAllMpeRoomsRequestBody,
    UserSearchMpeRoomsRequestBody,
    UserSearchMpeRoomsResponseBody,
} from '@musicroom/types';
import { request } from './http';

interface FetchLibraryMpeRoomsArgs {
    searchQuery: string;
    page: number;
}

export async function fetchLibraryMpeRooms({
    searchQuery,
    page,
}: FetchLibraryMpeRoomsArgs): Promise<MpeSearchMyRoomsResponseBody> {
    const body: MpeSearchMyRoomsRequestBody = {
        searchQuery,
        page,
    };

    const rawResponse = await request.post('/mpe/search/my-rooms', body);
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
    const body: ListAllMpeRoomsRequestBody = {
        searchQuery,
        page,
        userID,
    };

    const rawResponse = await request.post('/mpe/search/all-rooms', body);
    const parsedResponse = ListAllMpeRoomsResponseBody.parse(rawResponse.data);

    return parsedResponse;
}

interface FetchOtherUserMpeRoomsArgs {
    searchQuery: string;
    page: number;
    tmpAuthUserID: string;
    userID: string;
}

export async function fetchOtherUserMpeRooms({
    searchQuery,
    page,
    tmpAuthUserID,
    userID,
}: FetchOtherUserMpeRoomsArgs): Promise<UserSearchMpeRoomsResponseBody> {
    const body: UserSearchMpeRoomsRequestBody = {
        searchQuery,
        page,
        tmpAuthUserID,
        userID,
    };

    const rawResponse = await request.post('/user/search/mpe', body);
    const parsedResponse = UserSearchMpeRoomsResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponse;
}
