import * as z from 'zod';
import { PositiveInteger, StrictlyPositiveInteger } from './int';

export const UserSummary = z.object({
    id: z.string().uuid(),
    nickname: z.string(),
});
export type UserSummary = z.infer<typeof UserSummary>;

export const SearchUsersRequestBody = z.object({
    searchQuery: z.string().nonempty(),
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
