import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';

const MTV_ROOMS_SEARCH_LIMIT = 10;

export default class MtvRoomsHttpController {
    public async fetchMtvRooms({
        request,
    }: HttpContextContract): Promise<MtvRoomSearchResponse> {
        const rawBody = request.body();
        const { searchQuery, page } = MtvRoomSearchRequestBody.parse(rawBody);

        const roomsPagination = await MtvRoom.query()
            .preload('creator')
            .where('name', 'ilike', `${searchQuery}%`)
            .paginate(page, MTV_ROOMS_SEARCH_LIMIT);
        const totalRoomsToLoad = roomsPagination.total;
        const hasMoreRoomsToLoad = roomsPagination.hasMorePages;
        const formattedRooms = roomsPagination.all().map((room) => ({
            roomID: room.uuid,
            roomName: room.name,
            isOpen: room.isOpen,
            creatorName: room.creator.nickname,
        }));

        return {
            page,
            hasMore: hasMoreRoomsToLoad,
            totalEntries: totalRoomsToLoad,
            data: formattedRooms,
        };
    }
}
