import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    GetMyProfileInformationRequestBody,
    GetMyProfileInformationResponseBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    SearchUsersRequestBody,
    SearchUsersResponseBody,
} from '@musicroom/types';
import ForbiddenException from 'App/Exceptions/ForbiddenException';
import User from 'App/Models/User';
import invariant from 'tiny-invariant';

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
    }: HttpContextContract): Promise<GetUserProfileInformationResponseBody> {
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

    public async getMyProfileInformation({
        request,
    }: HttpContextContract): Promise<GetMyProfileInformationResponseBody> {
        const rawBody = request.body();

        const { tmpAuthUserID } =
            GetMyProfileInformationRequestBody.parse(rawBody);

        const user = await User.findOrFail(tmpAuthUserID);
        await user.load('devices');

        invariant(user.devices.length > 0, 'user has no related devices');

        return {
            userID: user.uuid,
            devicesCounter: user.devices.length,
            userNickname: user.nickname,
        };
    }
}
