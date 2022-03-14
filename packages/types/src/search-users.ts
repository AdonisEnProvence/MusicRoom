import * as z from 'zod';
import { PositiveInteger, StrictlyPositiveInteger } from './int';

export const UserSummary = z.object({
    userID: z.string().uuid(),
    nickname: z.string(),
});
export type UserSummary = z.infer<typeof UserSummary>;

export const PaginatedUserSummariesSearchResult = z.object({
    page: StrictlyPositiveInteger,
    totalEntries: PositiveInteger,
    hasMore: z.boolean(),
    data: z.array(UserSummary),
});

export type PaginatedUserSummariesSearchResult = z.infer<
    typeof PaginatedUserSummariesSearchResult
>;

export const SearchUsersRequestBody = z.object({
    searchQuery: z.string().nonempty(),
    page: StrictlyPositiveInteger,
});
export type SearchUsersRequestBody = z.infer<typeof SearchUsersRequestBody>;

export const SearchUsersResponseBody = PaginatedUserSummariesSearchResult;
export type SearchUsersResponseBody = z.infer<typeof SearchUsersResponseBody>;

export const ListUserFollowersRequestBody = z.object({
    searchQuery: z.string(),
    userID: z.string().uuid(),
    page: StrictlyPositiveInteger,
    tmpAuthUserID: z.string().uuid(),
});

export type ListUserFollowersRequestBody = z.infer<
    typeof ListUserFollowersRequestBody
>;

export const ListUserFollowersResponseBody = PaginatedUserSummariesSearchResult;

export type ListUserFollowersResponseBody = z.infer<
    typeof ListUserFollowersResponseBody
>;

export const ListUserFollowingRequestBody = z.object({
    searchQuery: z.string(),
    userID: z.string().uuid(),
    page: StrictlyPositiveInteger,
    tmpAuthUserID: z.string().uuid(),
});

export type ListUserFollowingRequestBody = z.infer<
    typeof ListUserFollowingRequestBody
>;

export const ListUserFollowingResponseBody = PaginatedUserSummariesSearchResult;

export type ListUserFollowingResponseBody = z.infer<
    typeof ListUserFollowingResponseBody
>;

export const ListMyFollowingRequestBody = z.object({
    searchQuery: z.string(),
    page: StrictlyPositiveInteger,
    tmpAuthUserID: z.string().uuid(),
});

export type ListMyFollowingRequestBody = z.infer<
    typeof ListMyFollowingRequestBody
>;

export const ListMyFollowingResponseBody = PaginatedUserSummariesSearchResult;
export type ListMyFollowingResponseBody = z.infer<
    typeof ListMyFollowingResponseBody
>;

export const ListMyFollowersRequestBody = z.object({
    searchQuery: z.string(),
    page: StrictlyPositiveInteger,
});

export type ListMyFollowersRequestBody = z.infer<
    typeof ListMyFollowersRequestBody
>;

export const ListMyFollowersResponseBody = PaginatedUserSummariesSearchResult;

export type ListMyFollowersResponseBody = z.infer<
    typeof ListMyFollowersResponseBody
>;
