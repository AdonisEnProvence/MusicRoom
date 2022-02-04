import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    GetMyProfileInformationRequestBody,
    GetMyProfileInformationResponseBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import ForbiddenException from 'App/Exceptions/ForbiddenException';
import User from 'App/Models/User';
import invariant from 'tiny-invariant';

const SEARCH_USERS_LIMIT = 10;

function getUserProfileInformationDependingOnItsVisibility({
    fieldValue,
    fieldVisibility,
    requestingUserIsfollowingRelatedUser,
}: {
    requestingUserIsfollowingRelatedUser: boolean;
    fieldValue: number;
    fieldVisibility: UserSettingVisibility;
}): number | undefined {
    switch (fieldVisibility) {
        case UserSettingVisibility.Values.PRIVATE: {
            return undefined;
        }
        case UserSettingVisibility.Values.PUBLIC: {
            return fieldValue;
        }
        case UserSettingVisibility.Values.FOLLOWERS_ONLY: {
            if (requestingUserIsfollowingRelatedUser) {
                return fieldValue;
            }
            return undefined;
        }
        default: {
            throw new Error(`unknown switch ue case ${fieldVisibility}`);
        }
    }
}

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
        const requestingUserIsfollowingRelatedUser = false; //tmp

        const relateduser = await User.findOrFail(userID);
        await relateduser.load('playlistsVisibilitySetting');
        await relateduser.load('relationsVisibilitySetting');
        await relateduser.load('mpeRooms');

        const {
            nickname: userNickname,
            playlistsVisibilitySetting,
            relationsVisibilitySetting,
        } = relateduser;

        const playlistsCounter =
            getUserProfileInformationDependingOnItsVisibility({
                fieldValue: relateduser.mpeRooms.length,
                fieldVisibility: playlistsVisibilitySetting.name,
                requestingUserIsfollowingRelatedUser,
            });

        const followingCounter =
            getUserProfileInformationDependingOnItsVisibility({
                fieldValue: 42, //FIXME relateduser.followings.length,
                fieldVisibility: relationsVisibilitySetting.name,
                requestingUserIsfollowingRelatedUser,
            });

        const followersCounter =
            getUserProfileInformationDependingOnItsVisibility({
                fieldValue: 21, //FIXME relateduser.followers.length,
                fieldVisibility: relationsVisibilitySetting.name,
                requestingUserIsfollowingRelatedUser,
            });

        return {
            userID,
            userNickname,
            following: requestingUserIsfollowingRelatedUser,
            playlistsCounter,
            followersCounter,
            followingCounter,
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
        await user.load('mpeRooms');
        const followingCounter = 12; //FIXME follow unfollow dev
        const followersCounter = 13; //FIXME follow unfollow dev

        invariant(user.devices.length > 0, 'user has no related devices');

        return {
            userID: user.uuid,
            devicesCounter: user.devices.length,
            userNickname: user.nickname,
            followersCounter,
            followingCounter,
            playlistsCounter: user.mpeRooms.length,
        };
    }
}
