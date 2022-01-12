import * as z from 'zod';
import { MpeRoomSummary } from './mpe';

export const MpeSearchMyRoomsRequestBody = z.object({
    userID: z.string().uuid(), // FIXME: use authentication
    searchQuery: z.string(),
});
export type MpeSearchMyRoomsRequestBody = z.infer<
    typeof MpeSearchMyRoomsRequestBody
>;

export const MpeSearchMyRoomsResponseBody = MpeRoomSummary.array();
export type MpeSearchMyRoomsResponseBody = z.infer<
    typeof MpeSearchMyRoomsResponseBody
>;

export const ListAllMpeRoomsRequestBody = z.object({
    searchQuery: z.string(),
});
export type ListAllMpeRoomsRequestBody = z.infer<
    typeof ListAllMpeRoomsRequestBody
>;

export const ListAllMpeRoomsResponseBody = MpeRoomSummary.array();
export type ListAllMpeRoomsResponseBody = z.infer<
    typeof ListAllMpeRoomsResponseBody
>;
