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
import invariant from 'tiny-invariant';
import * as z from 'zod';

const MTV_ROOMS_SEARCH_LIMIT = 10;

const FetchMtvRoomsRawPaginationEntry = MtvRoomSummary.omit({
    isInvited: true,
}).extend({
    invitationID: z.string().nullable(),
});
type FetchMtvRoomsRawPaginationEntry = z.infer<
    typeof FetchMtvRoomsRawPaginationEntry
>;

export default class MtvRoomsHttpController {
    /**
     * @fetchMtvRooms
     * @description Will list all alive mtv rooms. Can pass searchQuery. Uses pagination.
     * @requestBody
     */
    public async fetchMtvRooms({
        request,
        auth,
        bouncer,
    }: HttpContextContract): Promise<MtvRoomSearchResponse> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to fetch MTV rooms',
        );
        await bouncer.authorize('hasVerifiedAccount');

        const { searchQuery, page } = MtvRoomSearchRequestBody.parse(
            request.body(),
        );

        const roomsPagination =
            await Database.query<FetchMtvRoomsRawPaginationEntry>()
                .select('*')
                .from(
                    MtvRoom.query()
                        .preload('members')
                        .select(
                            'uuid as roomID',
                            'name as roomName',
                            'is_open as isOpen',
                            MtvRoomInvitation.query()
                                .where(
                                    'mtv_room_invitations.invited_user_id',
                                    user.uuid,
                                )
                                .whereColumn(
                                    'mtv_room_invitations.inviting_user_id',
                                    'mtv_rooms.creator',
                                )
                                .whereColumn(
                                    'mtv_room_invitations.mtv_room_id',
                                    'mtv_rooms.uuid',
                                )
                                .select(`mtv_room_invitations.uuid`)
                                .as('invitationID'),
                            User.query()
                                .select('nickname')
                                .whereColumn('mtv_rooms.creator', 'users.uuid')
                                .as('creatorName'),
                        )
                        .where('name', 'ilike', `${searchQuery}%`)
                        .andWhereDoesntHave('members', (userQuery) => {
                            return userQuery.where('uuid', user.uuid);
                        })
                        .as('derivated_table'),
                )
                .where((query) => {
                    return query
                        .where('derivated_table.isOpen', false)
                        .andWhereNotNull('derivated_table.invitationID');
                })
                .orWhere('derivated_table.isOpen', true)
                .orderBy([
                    {
                        column: 'derivated_table.isOpen',
                        order: 'asc',
                    },
                    {
                        column: 'derivated_table.invitationID',
                        order: 'asc',
                    },
                    {
                        column: 'derivated_table.roomID',
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
                const { invitationID, ...rest } =
                    FetchMtvRoomsRawPaginationEntry.parse(room);

                return MtvRoomSummary.parse({
                    ...rest,
                    isInvited: room.invitationID !== null,
                });
            });
        return {
            page,
            hasMore: hasMoreRoomsToLoad,
            totalEntries: totalRoomsToLoad,
            data: formattedRooms,
        };
    }
}
