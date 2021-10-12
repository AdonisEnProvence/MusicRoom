import * as z from 'zod';
import { MtvRoomSummary } from './mtv';

const PositiveInteger = z.number().int().nonnegative();
const StrictlyPositiveInteger = z.number().int().positive();

export const MtvRoomSearchRequestBody = z.object({
    searchQuery: z.string(),
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
