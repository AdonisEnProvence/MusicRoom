import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import {
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
    MtvRoomSummary,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
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

        // Database.raw(
        //     `
        //     (SELECT mtv_room_invitations.invited_user_id = ? AND mtv_room_invitations.mtv_room_id = mtv_rooms_uuid AS isInvited)
        //     `,
        //     [userID],
        // ),

        // const rooms = await Database.query().from('mtv_rooms').select;
        // .with('aliased_table', (query) => {
        //     query.from('users').select('*')
        //   })
        //   .select('*')
        //   .from('aliased_table')

        const roomsPagination = await MtvRoom.query()
            .preload('invitations')
            .select(
                'uuid',
                'name',
                'is_open',
                User.query()
                    .select('nickname')
                    .whereColumn('users.uuid', 'mtv_rooms.creator')
                    .as('creatorName'),
                Database.raw(
                    `
                    (SELECT mtv_room_invitations.invited_user_id = ? AND mtv_room_invitations.mtv_room_id = mtv_rooms.uuid AS isInvited FROM mtv_room_invitations)
                    `,
                    [userID],
                ),
            )
            .where('name', 'ilike', `${searchQuery}%`)
            .where('is_open', false)
            .whereHas('invitations', (query) => {
                query.where('invited_user_id', userID);
            })
            .orWhere('is_open', true)
            .orderBy([
                {
                    column: 'is_open',
                    order: 'asc',
                },
            ])
            .debug(true)
            .paginate(page, MTV_ROOMS_SEARCH_LIMIT);

        const totalRoomsToLoad = roomsPagination.total;
        const hasMoreRoomsToLoad = roomsPagination.hasMorePages;
        const formattedRooms: MtvRoomSummary[] = roomsPagination
            .all()
            .map((room) => {
                console.log(room.$extras);
                return {
                    creatorName: room.$extras.creatorName as string,
                    isOpen: room.isOpen,
                    roomID: room.uuid,
                    roomName: room.name,
                };
            });
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
