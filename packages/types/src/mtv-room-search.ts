import * as z from 'zod';

const PositiveInteger = z.number().int().nonnegative();
const StrictlyPositiveInteger = z.number().int().positive();

export const MtvRoomSearchRequestBody = z.object({
    searchQuery: z.string(),
    page: StrictlyPositiveInteger,
});
export type MtvRoomSearchRequestBody = z.infer<typeof MtvRoomSearchRequestBody>;

export const MtvRoomSearchResult = z.object({
    roomID: z.string(),
    roomName: z.string(),
    creatorName: z.string(),
    isOpen: z.boolean(),
});
export type MtvRoomSearchResult = z.infer<typeof MtvRoomSearchResult>;

export const MtvRoomSearchResponse = z.object({
    page: StrictlyPositiveInteger,
    totalEntries: PositiveInteger,
    hasMore: z.boolean(),
    data: z.array(MtvRoomSearchResult),
});
export type MtvRoomSearchResponse = z.infer<typeof MtvRoomSearchResponse>;
