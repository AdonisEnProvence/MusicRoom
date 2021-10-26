import * as z from 'zod';
import { PositiveInteger, StrictlyPositiveInteger } from './int';
import { MtvRoomSummary } from './mtv';

export const MtvRoomSearchRequestBody = z.object({
    searchQuery: z.string(),
    userID: z.string(),
    page: StrictlyPositiveInteger,
});
export type MtvRoomSearchRequestBody = z.infer<typeof MtvRoomSearchRequestBody>;

export const MtvRoomSearchResponse = z.object({
    page: StrictlyPositiveInteger,
    totalEntries: PositiveInteger,
    hasMore: z.boolean(),
    data: z.array(MtvRoomSummary),
});
export type MtvRoomSearchResponse = z.infer<typeof MtvRoomSearchResponse>;
