import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    FollowUserRequestBody,
    GetMyProfileInformationRequestBody,
    GetMyProfileInformationResponseBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    ListUserFollowersRequestBody,
    ListUserFollowersResponseBody,
    ListUserFollowingRequestBody,
    ListUserFollowingResponseBody,
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
    UserProfileInformation,
    UserSettingVisibility,
} from '@musicroom/types';
import { FollowUserResponseBody } from '@musicroom/types/src/user';
import ForbiddenException from 'App/Exceptions/ForbiddenException';
import User from 'App/Models/User';
import UserService from 'App/Services/UserService';
import invariant from 'tiny-invariant';

const SEARCH_USERS_LIMIT = 10;

async function throwErrorIfRequestingUserCanNotAccessRelatedUserRelationsVisibility({
    relatedUserID,
    requestingUserID,
}: {
    requestingUserID: string;
    relatedUserID: string;
}): Promise<void> {
    await User.findOrFail(requestingUserID);
    const relatedUser = await User.findOrFail(relatedUserID);
    await relatedUser.load('relationsVisibilitySetting');

    const relatedUserRelationsVisibilityName =
        relatedUser.relationsVisibilitySetting.name;

    switch (relatedUserRelationsVisibilityName) {
        case UserSettingVisibility.Values.PRIVATE: {
            throw new ForbiddenException();
        }
        case UserSettingVisibility.Values.PUBLIC: {
            return;
        }
        case UserSettingVisibility.Values.FOLLOWERS_ONLY: {
            const requestingUserIsFollowingRelatedUser =
                await UserService.userIsFollowingRelatedUser({
                    relatedUserID,
                    userID: requestingUserID,
                });
            const requestingUserIsNotfollowingRelatedUser =
                !requestingUserIsFollowingRelatedUser;

            if (requestingUserIsNotfollowingRelatedUser) {
                throw new ForbiddenException();
            }
            return;
        }
        default: {
            throw new Error(
                `unknown switch ue case ${relatedUserRelationsVisibilityName}`,
            );
        }
    }
}

function getUserProfileInformationDependingOnItsVisibility({
    fieldValue,
    fieldVisibility,
    requestingUserIsFollowingRelatedUser,
}: {
    requestingUserIsFollowingRelatedUser: boolean;
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
            if (requestingUserIsFollowingRelatedUser) {
                return fieldValue;
            }
            return undefined;
        }
        default: {
            throw new Error(`unknown switch ue case ${fieldVisibility}`);
        }
    }
}

async function requestUserProfileInformation({
    requestingUserID,
    userID,
}: {
    requestingUserID: string;
    userID: string;
}): Promise<UserProfileInformation> {
    const requestingUserIsRelatedUser = requestingUserID === userID;
    if (requestingUserIsRelatedUser) {
        throw new ForbiddenException();
    }

    const requestingUserIsFollowingRelatedUser =
        await UserService.userIsFollowingRelatedUser({
            relatedUserID: userID,
            userID: requestingUserID,
        });

    const relateduser = await User.findOrFail(userID);
    //Note: cannot load relationship after the loadAggregate block
    await relateduser.load('playlistsVisibilitySetting');
    await relateduser.load('relationsVisibilitySetting');

    const {
        nickname: userNickname,
        playlistsVisibilitySetting,
        relationsVisibilitySetting,
    } = relateduser;

    await relateduser
        .loadCount('following')
        .loadCount('followers')
        .loadCount('mpeRooms');

    const playlistsCounter = getUserProfileInformationDependingOnItsVisibility({
        fieldValue: Number(relateduser.$extras.mpeRooms_count),
        fieldVisibility: playlistsVisibilitySetting.name,
        requestingUserIsFollowingRelatedUser,
    });

    const followingCounter = getUserProfileInformationDependingOnItsVisibility({
        fieldValue: Number(relateduser.$extras.following_count),
        fieldVisibility: relationsVisibilitySetting.name,
        requestingUserIsFollowingRelatedUser,
    });

    const followersCounter = getUserProfileInformationDependingOnItsVisibility({
        fieldValue: Number(relateduser.$extras.followers_count),
        fieldVisibility: relationsVisibilitySetting.name,
        requestingUserIsFollowingRelatedUser,
    });

    return {
        userID,
        userNickname,
        following: requestingUserIsFollowingRelatedUser,
        playlistsCounter,
        followersCounter,
        followingCounter,
    };
}

export default class SearchUsersController {
    public async searchUsers({
        request,
    }: HttpContextContract): Promise<SearchUsersResponseBody> {
        const rawBody = request.body();
        //FIXME AUTH Given userID is TMP
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

    public async listUserFollowers({
        request,
    }: HttpContextContract): Promise<ListUserFollowersResponseBody> {
        const rawBody = request.body();
        const { page, searchQuery, userID, tmpAuthUserID } =
            ListUserFollowersRequestBody.parse(rawBody);

        //Checking relations visibility
        await throwErrorIfRequestingUserCanNotAccessRelatedUserRelationsVisibility(
            {
                relatedUserID: userID,
                requestingUserID: tmpAuthUserID,
            },
        );
        //
        const usersFollowersPagination = await User.query()
            .whereNot('uuid', userID)
            .andWhere('nickname', 'ilike', `${searchQuery}%`)
            .andWhereHas('following', (userQuery) => {
                return userQuery.where('uuid', userID);
            })
            .orderBy('nickname', 'asc')
            .paginate(page, SEARCH_USERS_LIMIT);
        const totalUsersToLoad = usersFollowersPagination.total;
        const hasMoreUsersToLoad = usersFollowersPagination.hasMorePages;
        const formattedUsers = usersFollowersPagination.all().map((user) => ({
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

    public async listUserFollowing({
        request,
    }: HttpContextContract): Promise<ListUserFollowingResponseBody> {
        const rawBody = request.body();
        const { page, searchQuery, userID, tmpAuthUserID } =
            ListUserFollowingRequestBody.parse(rawBody);

        //Checking relations visibility
        await throwErrorIfRequestingUserCanNotAccessRelatedUserRelationsVisibility(
            {
                relatedUserID: userID,
                requestingUserID: tmpAuthUserID,
            },
        );
        //

        const usersFollowersPagination = await User.query()
            .whereNot('uuid', userID)
            .andWhere('nickname', 'ilike', `${searchQuery}%`)
            .andWhereHas('followers', (userQuery) => {
                return userQuery.where('uuid', userID);
            })
            .orderBy('nickname', 'asc')
            .paginate(page, SEARCH_USERS_LIMIT);
        const totalUsersToLoad = usersFollowersPagination.total;
        const hasMoreUsersToLoad = usersFollowersPagination.hasMorePages;
        const formattedUsers = usersFollowersPagination.all().map((user) => ({
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

        await User.findOrFail(tmpAuthUserID);
        const userProfileInformation = await requestUserProfileInformation({
            requestingUserID: tmpAuthUserID,
            userID,
        });

        return {
            ...userProfileInformation,
        };
    }

    public async getMyProfileInformation({
        request,
    }: HttpContextContract): Promise<GetMyProfileInformationResponseBody> {
        const rawBody = request.body();

        const { tmpAuthUserID } =
            GetMyProfileInformationRequestBody.parse(rawBody);

        const user = await User.findOrFail(tmpAuthUserID);
        const { nickname: userNickname } = user;

        //After this user model column are erased
        await user
            .loadCount('following')
            .loadCount('followers')
            .loadCount('mpeRooms')
            .loadCount('devices');

        const devicesCounter = Number(user.$extras.devices_count);
        invariant(devicesCounter > 0, 'user has no related devices');

        return {
            userID: user.uuid,
            userNickname,
            devicesCounter,
            followersCounter: Number(user.$extras.followers_count),
            followingCounter: Number(user.$extras.following_count),
            playlistsCounter: Number(user.$extras.mpeRooms_count),
        };
    }

    public async followUser({
        request,
    }: HttpContextContract): Promise<FollowUserResponseBody> {
        const rawBody = request.body();

        const { tmpAuthUserID, userID } = FollowUserRequestBody.parse(rawBody);

        const requestingUserIsRelatedUser = tmpAuthUserID === userID;
        if (requestingUserIsRelatedUser) {
            throw new ForbiddenException();
        }

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

        const userProfileInformation = await requestUserProfileInformation({
            requestingUserID: tmpAuthUserID,
            userID,
        });

        return {
            userProfileInformation,
        };
    }

    public async unfollowUser({
        request,
    }: HttpContextContract): Promise<UnfollowUserResponseBody> {
        const rawBody = request.body();

        const { tmpAuthUserID, userID } =
            UnfollowUserRequestBody.parse(rawBody);

        const requestingUserIsRelatedUser = tmpAuthUserID === userID;
        if (requestingUserIsRelatedUser) {
            throw new ForbiddenException();
        }

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

        const userProfileInformation = await requestUserProfileInformation({
            requestingUserID: tmpAuthUserID,
            userID,
        });

        return {
            userProfileInformation,
        };
    }
}
