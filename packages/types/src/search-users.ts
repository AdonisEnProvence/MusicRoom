import * as z from 'zod';
import { PositiveInteger, StrictlyPositiveInteger } from './int';

export const UserSummary = z.object({
    userID: z.string().uuid(),
    nickname: z.string(),
});
export type UserSummary = z.infer<typeof UserSummary>;

export const SearchUsersRequestBody = z.object({
    searchQuery: z.string().nonempty(),
    userID: z.string().uuid(),
    page: StrictlyPositiveInteger,
});
export type SearchUsersRequestBody = z.infer<typeof SearchUsersRequestBody>;

export const SearchUsersResponseBody = z.object({
    page: StrictlyPositiveInteger,
    totalEntries: PositiveInteger,
    hasMore: z.boolean(),
    data: z.array(UserSummary),
});
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

export const ListUserFollowersResponseBody = z.object({
    page: StrictlyPositiveInteger,
    totalEntries: PositiveInteger,
    hasMore: z.boolean(),
    data: z.array(UserSummary),
});

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

export const ListUserFollowingResponseBody = z.object({
    page: StrictlyPositiveInteger,
    totalEntries: PositiveInteger,
    hasMore: z.boolean(),
    data: z.array(UserSummary),
});

export type ListUserFollowingResponseBody = z.infer<
    typeof ListUserFollowingResponseBody
>;
