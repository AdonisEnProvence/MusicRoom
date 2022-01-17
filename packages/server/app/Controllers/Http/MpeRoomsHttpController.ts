import {
    ListAllMpeRoomsRequestBody,
    ListAllMpeRoomsResponseBody,
    MpeSearchMyRoomsRequestBody,
    MpeSearchMyRoomsResponseBody,
} from '@musicroom/types';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import User from 'App/Models/User';
import MpeRoom from 'App/Models/MpeRoom';
import { datatype } from 'faker';
import MpeRoomInvitation from 'App/Models/MpeRoomInvitation';
import { fromMpeRoomsToMpeRoomSummaries } from '../Ws/MpeRoomsWsController';

const MPE_ROOMS_SEARCH_LIMIT = 10;

export default class MpeRoomsHttpController {
    //TODO should list private with invitation etc etc and takes an userID
    public async listAllRooms({
        request,
    }: HttpContextContract): Promise<ListAllMpeRoomsResponseBody> {
        const { searchQuery, page, userID } = ListAllMpeRoomsRequestBody.parse(
            request.body(),
        );

        const allMpeRoomsPagination = await MpeRoom.query()
            .select([
                '*',
                MpeRoomInvitation.query()
                    .count('*')
                    .as('invitations_count')
                    .where('mpe_room_invitations.invited_user_id', userID)
                    .andWhereColumn(
                        'mpe_room_invitations.mpe_room_id',
                        'mpe_rooms.uuid',
                    )
                    .limit(1),
            ])
            .where('name', 'ilike', `${searchQuery}%`)
            .andWhereDoesntHave('members', (membersQuery) => {
                return membersQuery.where('user_uuid', userID);
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
            userID: datatype.uuid(), //TODO this is temporary we need to be refactor during mpe search engine implem
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
    }: HttpContextContract): Promise<MpeSearchMyRoomsResponseBody> {
        const rawBody = request.body();
        //TODO The userID raw in the request body is temporary
        //Later it will be a session cookie to avoid any security issues
        const { userID, searchQuery, page } =
            MpeSearchMyRoomsRequestBody.parse(rawBody);

        const user = await User.findOrFail(userID);
        const mpeRoomsPagination = await user
            .related('mpeRooms')
            .query()
            .where('name', 'ilike', `${searchQuery}%`)
            .orderBy([
                {
                    column: 'mpe_rooms.is_open',
                    order: 'asc',
                },
                // FIXME: need to handle invitations
                // {
                //     column: 'invitationID',
                //     order: 'asc',
                // },
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
            userID: datatype.uuid(), //TODO this is temporary we need to be refactor during mpe search engine implem
        });

        return {
            page,
            data: formattedMpeRooms,
            hasMore: hasMoreRoomsToLoad,
            totalEntries: totalRoomsToLoad,
        };
    }
}
