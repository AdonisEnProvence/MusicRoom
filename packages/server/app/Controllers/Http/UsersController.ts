import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    UserSearchMpeRoomsRequestBody,
    UserSearchMpeRoomsResponseBody,
} from '@musicroom/types';
import ForbiddenException from 'App/Exceptions/ForbiddenException';
import User from 'App/Models/User';
import UserService from 'App/Services/UserService';
import { fromMpeRoomsToMpeRoomSummaries } from '../Ws/MpeRoomsWsController';

interface ComputeUserCanQueryOtherUserMpeRoomsArgs {
    user: User;
    queriedUser: User;
}

async function getIfUserCanQueryOtherUserMpeRooms({
    user,
    queriedUser,
}: ComputeUserCanQueryOtherUserMpeRoomsArgs): Promise<boolean> {
    await queriedUser.load('playlistsVisibilitySetting');

    switch (queriedUser.playlistsVisibilitySetting.name) {
        case 'PRIVATE': {
            return false;
        }
        case 'PUBLIC': {
            return true;
        }
        case 'FOLLOWERS_ONLY': {
            const requestingUserIsFollowingQueriedUser =
                await UserService.userIsFollowingRelatedUser({
                    relatedUserID: queriedUser.uuid,
                    userID: user.uuid,
                });
            const userCanQueryOtherUserMpeRooms =
                requestingUserIsFollowingQueriedUser === true;

            return userCanQueryOtherUserMpeRooms;
        }
        default: {
            throw new Error('Reached unreachable state');
        }
    }
}

export default class UsersController {
    public async listUserMpeRooms({
        request,
    }: HttpContextContract): Promise<UserSearchMpeRoomsResponseBody> {
        const MPE_ROOMS_SEARCH_LIMIT = 10;
        const rawBody = request.body();

        const { tmpAuthUserID, userID, searchQuery, page } =
            UserSearchMpeRoomsRequestBody.parse(rawBody);

        const me = await User.findOrFail(tmpAuthUserID);
        const queriedUser = await User.findOrFail(userID);

        const userCanQueryOtherUserMpeRooms =
            await getIfUserCanQueryOtherUserMpeRooms({
                user: me,
                queriedUser,
            });
        const userCanNotQueryOtherUserMpeRooms =
            userCanQueryOtherUserMpeRooms === false;
        if (userCanNotQueryOtherUserMpeRooms === true) {
            throw new ForbiddenException();
        }

        const mpeRoomsPagination = await queriedUser
            .related('mpeRooms')
            .query()
            .where('name', 'ilike', `${searchQuery}%`)
            .andWhere('is_open', true)
            .orderBy([
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
            userID: me.uuid,
        });

        return {
            page,
            data: formattedMpeRooms,
            hasMore: hasMoreRoomsToLoad,
            totalEntries: totalRoomsToLoad,
        };
    }
}
