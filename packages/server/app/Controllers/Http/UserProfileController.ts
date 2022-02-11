import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    FollowUserRequestBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
    UserProfileInformation,
    UserSettingVisibility,
} from '@musicroom/types';
import { FollowUserResponseBody } from '@musicroom/types/src/user';
import ForbiddenException from 'App/Exceptions/ForbiddenException';
import User from 'App/Models/User';
import UserService from 'App/Services/UserService';

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

export default class UserProfileController {
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
