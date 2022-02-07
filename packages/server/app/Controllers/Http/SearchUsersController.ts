import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    FollowUserRequestBody,
    GetMyProfileInformationRequestBody,
    GetMyProfileInformationResponseBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import { FollowUserResponseBody } from '@musicroom/types/src/user';
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

        const requestingUser = await User.findOrFail(tmpAuthUserID);
        await requestingUser.load('following', (userQuery) => {
            return userQuery.where('uuid', userID);
        });
        const requestingUserIsfollowingRelatedUser =
            requestingUser.following.length > 0;

        const relateduser = await User.findOrFail(userID);
        await relateduser.load('playlistsVisibilitySetting');
        await relateduser.load('relationsVisibilitySetting');
        await relateduser.load('mpeRooms');
        await relateduser.load('following');
        await relateduser.load('followers');

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
                fieldValue: relateduser.following.length,
                fieldVisibility: relationsVisibilitySetting.name,
                requestingUserIsfollowingRelatedUser,
            });

        const followersCounter =
            getUserProfileInformationDependingOnItsVisibility({
                fieldValue: relateduser.followers.length,
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
        await user.load('followers');
        await user.load('following');

        invariant(user.devices.length > 0, 'user has no related devices');

        return {
            userID: user.uuid,
            devicesCounter: user.devices.length,
            userNickname: user.nickname,
            followersCounter: user.followers.length,
            followingCounter: user.following.length,
            playlistsCounter: user.mpeRooms.length,
        };
    }

    public async followUser({
        request,
    }: HttpContextContract): Promise<FollowUserResponseBody> {
        const rawBody = request.body();

        const { tmpAuthUserID, userID } = FollowUserRequestBody.parse(rawBody);

        const followingUser = await User.findOrFail(tmpAuthUserID);
        await followingUser.load('following', (userQuery) => {
            return userQuery.where('uuid', userID);
        });
        const followedUser = await User.findOrFail(userID);
        await followedUser.load('followers', (userQuery) => {
            return userQuery.where('uuid', tmpAuthUserID);
        });

        const followingUserIsAlreadyFollowingGivenUser =
            followingUser.following.length > 0;
        const followedUserAlreadyHasFollowingUserInHisFollowers =
            followedUser.followers.length > 0;
        if (
            followingUserIsAlreadyFollowingGivenUser ||
            followedUserAlreadyHasFollowingUserInHisFollowers
        ) {
            throw new Error('User is already following given user');
        }

        await followingUser.related('following').save(followedUser);

        return {
            status: 'SUCCESS',
        };
    }

    public async unfollowUser({
        request,
    }: HttpContextContract): Promise<UnfollowUserResponseBody> {
        const rawBody = request.body();

        const { tmpAuthUserID, userID } =
            UnfollowUserRequestBody.parse(rawBody);

        const unfollowingUser = await User.findOrFail(tmpAuthUserID);
        await unfollowingUser.load('following', (userQuery) => {
            return userQuery.where('uuid', userID);
        });
        const unfollowedUser = await User.findOrFail(userID);
        await unfollowedUser.load('followers', (userQuery) => {
            return userQuery.where('uuid', tmpAuthUserID);
        });

        const unfollowingUserDoesnotFollowGivenUser =
            unfollowingUser.following.length === 0;
        const unfollowedUserDoesnotHaveFollowingUserInHisFollowers =
            unfollowedUser.followers.length === 0;
        if (
            unfollowingUserDoesnotFollowGivenUser ||
            unfollowedUserDoesnotHaveFollowingUserInHisFollowers
        ) {
            throw new Error('User is not following given user');
        }

        await unfollowingUser
            .related('following')
            .detach([unfollowedUser.uuid]);

        return {
            status: 'SUCCESS',
        };
    }
}
