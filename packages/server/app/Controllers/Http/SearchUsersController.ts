import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    SearchUsersRequestBody,
    SearchUsersResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';

const SEARCH_USERS_LIMIT = 10;

export default class SearchUsersController {
    public async searchUsers({
        request,
    }: HttpContextContract): Promise<SearchUsersResponseBody> {
        const rawBody = request.body();
        const { searchQuery, page } = SearchUsersRequestBody.parse(rawBody);

        const usersPagination = await User.query()
            .where('nickname', 'ilike', `${searchQuery}%`)
            .orderBy('nickname', 'asc')
            .paginate(page, SEARCH_USERS_LIMIT);
        const totalUsersToLoad = usersPagination.total;
        const hasMoreUsersToLoad = usersPagination.hasMorePages;
        const formattedUsers = usersPagination.all().map((user) => ({
            id: user.uuid,
            nickname: user.nickname,
        }));

        return {
            page,
            hasMore: hasMoreUsersToLoad,
            totalEntries: totalUsersToLoad,
            data: formattedUsers,
        };
    }
}
