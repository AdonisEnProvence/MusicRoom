import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    ListMyFollowersRequestBody,
    ListMyFollowersResponseBody,
    ListMyFollowingRequestBody,
    ListMyFollowingResponseBody,
    ListUserFollowersRequestBody,
    ListUserFollowersResponseBody,
    ListUserFollowingRequestBody,
    ListUserFollowingResponseBody,
    PaginatedUserSummariesSearchResult,
    SearchUsersRequestBody,
    SearchUsersResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import ForbiddenException from 'App/Exceptions/ForbiddenException';
import User from 'App/Models/User';
import UserService from 'App/Services/UserService';
import invariant from 'tiny-invariant';

const SEARCH_USERS_LIMIT = 10;

async function listUserFollowers({
    page,
    searchQuery,
    userID,
}: {
    searchQuery: string;
    page: number;
    userID: string;
}): Promise<PaginatedUserSummariesSearchResult> {
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

async function listUserFollowing({
    page,
    searchQuery,
    userID,
}: {
    searchQuery: string;
    page: number;
    userID: string;
}): Promise<PaginatedUserSummariesSearchResult> {
    const usersFollowingPagination = await User.query()
        .whereNot('uuid', userID)
        .andWhere('nickname', 'ilike', `${searchQuery}%`)
        .andWhereHas('followers', (userQuery) => {
            return userQuery.where('uuid', userID);
        })
        .orderBy('nickname', 'asc')
        .paginate(page, SEARCH_USERS_LIMIT);
    const totalUsersToLoad = usersFollowingPagination.total;
    const hasMoreUsersToLoad = usersFollowingPagination.hasMorePages;
    const formattedUsers = usersFollowingPagination.all().map((user) => ({
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

export default class SearchUsersController {
    public async searchUsers({
        request,
        auth,
        bouncer,
    }: HttpContextContract): Promise<SearchUsersResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to search users',
        );
        await bouncer.authorize('hasVerifiedAccount');

        const rawBody = request.body();
        const { searchQuery, page } = SearchUsersRequestBody.parse(rawBody);

        const usersPagination = await User.query()
            .whereNot('uuid', user.uuid)
            .andWhere('nickname', 'ilike', `${searchQuery}%`)
            .orderBy('nickname', 'asc')
            .paginate(page, SEARCH_USERS_LIMIT);
        const totalUsersToLoad = usersPagination.total;
        const hasMoreUsersToLoad = usersPagination.hasMorePages;
        const formattedUsers = usersPagination.all().map((paginatedUser) => ({
            userID: paginatedUser.uuid,
            nickname: paginatedUser.nickname,
        }));

        return {
            page,
            hasMore: hasMoreUsersToLoad,
            totalEntries: totalUsersToLoad,
            data: formattedUsers,
        };
    }

    /**
     * @listUserFollowers
     * @description Authenticated route that returns given user followers list. Can fail depending on given user relations visibility. Uses pagination.
     * @requestBody
     */
    public async listUserFollowers({
        request,
        auth,
        bouncer,
    }: HttpContextContract): Promise<ListUserFollowersResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            "User must be authenticated to list another user's followers",
        );
        await bouncer.authorize('hasVerifiedAccount');

        const { page, searchQuery, userID } =
            ListUserFollowersRequestBody.parse(request.body());

        await throwErrorIfRequestingUserCanNotAccessRelatedUserRelationsVisibility(
            {
                relatedUserID: userID,
                requestingUserID: user.uuid,
            },
        );
        //

        return await listUserFollowers({
            page,
            searchQuery,
            userID,
        });
    }

    /**
     * @listUserFollowing
     * @description Authenticated route that returns given user following. Can fail depending on given user relations visibility. Uses pagination
     * @requestBody
     */
    public async listUserFollowing({
        request,
        auth,
        bouncer,
    }: HttpContextContract): Promise<ListUserFollowingResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            "User must be authenticated to list another user's following",
        );
        await bouncer.authorize('hasVerifiedAccount');

        const { page, searchQuery, userID } =
            ListUserFollowingRequestBody.parse(request.body());

        //TODO tmpAUThUSerID !== relatedUserID + tests
        //Checking relations visibility
        await throwErrorIfRequestingUserCanNotAccessRelatedUserRelationsVisibility(
            {
                relatedUserID: userID,
                requestingUserID: user.uuid,
            },
        );
        //

        return await listUserFollowing({
            page,
            searchQuery,
            userID,
        });
    }

    /**
     * @listMyFollowing
     * @description Authenticated route that returns authenticated user following list. Uses pagination.
     * @requestBody
     */
    public async listMyFollowing({
        request,
        auth,
        bouncer,
    }: HttpContextContract): Promise<ListMyFollowingResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to list her following',
        );
        await bouncer.authorize('hasVerifiedAccount');

        const { page, searchQuery } = ListMyFollowingRequestBody.parse(
            request.body(),
        );

        return await listUserFollowing({
            page,
            searchQuery,
            userID: user.uuid,
        });
    }

    /**
     * @listMyFollowers
     * @description Authenticated route that returns authenticated user followers list. Uses pagination.
     * @requestBody
     */
    public async listMyFollowers({
        request,
        auth,
        bouncer,
    }: HttpContextContract): Promise<ListMyFollowersResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to list her followers',
        );
        await bouncer.authorize('hasVerifiedAccount');

        const { page, searchQuery } = ListMyFollowersRequestBody.parse(
            request.body(),
        );

        return await listUserFollowers({
            page,
            searchQuery,
            userID: user.uuid,
        });
    }
}
