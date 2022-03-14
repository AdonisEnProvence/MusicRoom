import {
    ListAllMpeRoomsRequestBody,
    ListAllMpeRoomsResponseBody,
    MpeSearchMyRoomsRequestBody,
    MpeSearchMyRoomsResponseBody,
} from '@musicroom/types';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import MpeRoom from 'App/Models/MpeRoom';
import MpeRoomInvitation from 'App/Models/MpeRoomInvitation';
import invariant from 'tiny-invariant';
import { fromMpeRoomsToMpeRoomSummaries } from '../Ws/MpeRoomsWsController';

const MPE_ROOMS_SEARCH_LIMIT = 10;

export default class MpeRoomsHttpController {
    public async listAllRooms({
        request,
        auth,
    }: HttpContextContract): Promise<ListAllMpeRoomsResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be logged in to list all Mpe rooms',
        );

        const { searchQuery, page } = ListAllMpeRoomsRequestBody.parse(
            request.body(),
        );

        const allMpeRoomsPagination = await MpeRoom.query()
            .select([
                '*',
                MpeRoomInvitation.query()
                    .count('*')
                    .as('invitations_count')
                    .where('mpe_room_invitations.invited_user_id', user.uuid)
                    .andWhereColumn(
                        'mpe_room_invitations.mpe_room_id',
                        'mpe_rooms.uuid',
                    )
                    .limit(1),
            ])
            .where('name', 'ilike', `${searchQuery}%`)
            .andWhereDoesntHave('members', (membersQuery) => {
                return membersQuery.where('user_uuid', user.uuid);
            })
            .orderBy([
                {
                    column: 'mpe_rooms.is_open',
                    order: 'asc',
                },
                {
                    column: 'invitations_count',
                    order: 'desc',
                },
                {
                    column: 'mpe_rooms.uuid',
                    order: 'asc',
                },
            ])
            .preload('creator')
            .paginate(page, MPE_ROOMS_SEARCH_LIMIT);

        const totalRoomsToLoad = allMpeRoomsPagination.total;
        const hasMoreRoomsToLoad = allMpeRoomsPagination.hasMorePages;
        const formattedMpeRooms = await fromMpeRoomsToMpeRoomSummaries({
            mpeRooms: allMpeRoomsPagination.all(),
            userID: user.uuid,
        });

        return {
            page,
            data: formattedMpeRooms,
            hasMore: hasMoreRoomsToLoad,
            totalEntries: totalRoomsToLoad,
        };
    }

    public async listMyRooms({
        request,
        auth,
    }: HttpContextContract): Promise<MpeSearchMyRoomsResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be logged in to list their own Mpe rooms',
        );

        const { searchQuery, page } = MpeSearchMyRoomsRequestBody.parse(
            request.body(),
        );

        const mpeRoomsPagination = await user
            .related('mpeRooms')
            .query()
            .where('name', 'ilike', `${searchQuery}%`)
            .orderBy([
                {
                    column: 'mpe_rooms.is_open',
                    order: 'asc',
                },
                {
                    column: 'mpe_rooms.uuid',
                    order: 'asc',
                },
            ])
            .preload('creator')
            .paginate(page, MPE_ROOMS_SEARCH_LIMIT);

        const totalRoomsToLoad = mpeRoomsPagination.total;
        const hasMoreRoomsToLoad = mpeRoomsPagination.hasMorePages;
        const formattedMpeRooms = await fromMpeRoomsToMpeRoomSummaries({
            mpeRooms: mpeRoomsPagination.all(),
            userID: user.uuid,
        });

        return {
            page,
            data: formattedMpeRooms,
            hasMore: hasMoreRoomsToLoad,
            totalEntries: totalRoomsToLoad,
        };
    }
}
