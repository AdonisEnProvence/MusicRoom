import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import {
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
    MtvRoomSummary,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import MtvRoomInvitation from 'App/Models/MtvRoomInvitation';
import User from 'App/Models/User';

const MTV_ROOMS_SEARCH_LIMIT = 10;

export default class MtvRoomsHttpController {
    public async listAllRooms(): Promise<string[]> {
        const rooms = await MtvRoom.all();
        return rooms.map<string>((room) => room.uuid);
    }

    public async fetchMtvRooms({
        request,
    }: HttpContextContract): Promise<MtvRoomSearchResponse> {
        const rawBody = request.body();
        const { searchQuery, page, userID } =
            MtvRoomSearchRequestBody.parse(rawBody);

        const roomsPagination = await Database.query()
            .select('*')
            .from(
                MtvRoom.query()
                    .preload('invitations')
                    .select(
                        'uuid as roomID',
                        'name as roomName',
                        'is_open as isOpen',
                        User.query()
                            .select('nickname')
                            .whereColumn('users.uuid', 'mtv_rooms.creator')
                            .as('creatorName'),
                        MtvRoomInvitation.query()
                            .select(
                                Database.raw(
                                    `mtv_room_invitations.invited_user_id = ? AND mtv_room_invitations.mtv_room_id = mtv_rooms.uuid`,
                                    [userID],
                                ),
                            )
                            .as('isInvited'),
                    )
                    .as('derivated_table'),
            )
            .where('derivated_table.roomName', 'ilike', `${searchQuery}%`)
            .where((query) => {
                query.where('derivated_table.isOpen', false);
                query.where('derivated_table.isInvited', true);
            })
            .orWhere('derivated_table.isOpen', true)
            .orderBy([
                {
                    column: 'derivated_table.isInvited',
                    order: 'desc',
                },
                {
                    column: 'derivated_table.isOpen',
                    order: 'desc',
                },
            ])
            .debug(true)
            .paginate(page, MTV_ROOMS_SEARCH_LIMIT);

        const totalRoomsToLoad = roomsPagination.total;
        const hasMoreRoomsToLoad = roomsPagination.hasMorePages;
        const formattedRooms: MtvRoomSummary[] = roomsPagination
            .all()
            .map((room) => MtvRoomSummary.parse(room));
        console.log('*******');
        console.log(formattedRooms);
        console.log('*******');

        return {
            page,
            hasMore: hasMoreRoomsToLoad,
            totalEntries: totalRoomsToLoad,
            data: formattedRooms,
        };
    }
}
