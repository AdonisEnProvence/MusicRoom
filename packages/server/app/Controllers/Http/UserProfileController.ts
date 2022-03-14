import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    FollowUserRequestBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
    UserProfileInformation,
    UserSearchMpeRoomsRequestBody,
    UserSearchMpeRoomsResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import { FollowUserResponseBody } from '@musicroom/types/src/user';
import ForbiddenException from 'App/Exceptions/ForbiddenException';
import User from 'App/Models/User';
import UserService from 'App/Services/UserService';
import invariant from 'tiny-invariant';
import { fromMpeRoomsToMpeRoomSummaries } from '../Ws/MpeRoomsWsController';

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

export default class UserProfileController {
    public async getUserProfileInformation({
        request,
        auth,
    }: HttpContextContract): Promise<GetUserProfileInformationResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            "User must be authenticated to get another user's profile information",
        );

        const { userID } = GetUserProfileInformationRequestBody.parse(
            request.body(),
        );

        const userProfileInformation = await requestUserProfileInformation({
            requestingUserID: user.uuid,
            userID,
        });

        return {
            ...userProfileInformation,
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
