import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    GetUserProfileInformationRequestBody,
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    UserProfileInformation,
} from '@musicroom/types';
import ForbiddenException from 'App/Exceptions/ForbiddenException';
import User from 'App/Models/User';

const SEARCH_USERS_LIMIT = 10;

export default class SearchUsersController {
    public async searchUsers({
        request,
    }: HttpContextContract): Promise<SearchUsersResponseBody> {
        const rawBody = request.body();
        const { searchQuery, page, userID } =
            SearchUsersRequestBody.parse(rawBody);

        const usersPagination = await User.query()
            .whereNot('uuid', userID)
            .andWhere('nickname', 'ilike', `${searchQuery}%`)
            .orderBy('nickname', 'asc')
            .paginate(page, SEARCH_USERS_LIMIT);
        const totalUsersToLoad = usersPagination.total;
        const hasMoreUsersToLoad = usersPagination.hasMorePages;
        const formattedUsers = usersPagination.all().map((user) => ({
            userID: user.uuid,
            nickname: user.nickname,
        }));

        return {
            page,
            hasMore: hasMoreUsersToLoad,
            totalEntries: totalUsersToLoad,
            data: formattedUsers,
        };
    }

    public async getUserProfileInformation({
        request,
    }: HttpContextContract): Promise<UserProfileInformation> {
        const rawBody = request.body();
        //TODO tmpAuthUserID refactor authentication
        const { tmpAuthUserID, userID } =
            GetUserProfileInformationRequestBody.parse(rawBody);

        const requestingUserIsRelatedUser = tmpAuthUserID === userID;
        if (requestingUserIsRelatedUser) {
            throw new ForbiddenException();
        }

        await User.findOrFail(tmpAuthUserID);
        //TODO refactor after follow feature implem
        const following = false; //tmp

        const { nickname: userNickname } = await User.findOrFail(userID);

        return {
            userID,
            userNickname,
            following,
        };
    }
}
