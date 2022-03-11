import * as z from 'zod';
import { PositiveInteger, StrictlyPositiveInteger } from './int';
import { MpeRoomSummary } from './mpe';

export const MpeSearchMyRoomsRequestBody = z.object({
    searchQuery: z.string(),
    page: StrictlyPositiveInteger,
});
export type MpeSearchMyRoomsRequestBody = z.infer<
    typeof MpeSearchMyRoomsRequestBody
>;

export const MpeSearchMyRoomsResponseBody = z.object({
    page: StrictlyPositiveInteger,
    totalEntries: PositiveInteger,
    hasMore: z.boolean(),
    data: MpeRoomSummary.array(),
});
export type MpeSearchMyRoomsResponseBody = z.infer<
    typeof MpeSearchMyRoomsResponseBody
>;

export const ListAllMpeRoomsRequestBody = z.object({
    userID: z.string().uuid(), // FIXME: use authentication
    searchQuery: z.string(),
    page: StrictlyPositiveInteger,
});
export type ListAllMpeRoomsRequestBody = z.infer<
    typeof ListAllMpeRoomsRequestBody
>;

export const ListAllMpeRoomsResponseBody = z.object({
    page: StrictlyPositiveInteger,
    totalEntries: PositiveInteger,
    hasMore: z.boolean(),
    data: MpeRoomSummary.array(),
});
export type ListAllMpeRoomsResponseBody = z.infer<
    typeof ListAllMpeRoomsResponseBody
>;
