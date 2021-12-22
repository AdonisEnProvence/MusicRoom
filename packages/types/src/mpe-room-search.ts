import * as z from 'zod';
import { MpeRoomSummary } from './mpe';

export const LibraryMpeRoomSearchResponseBody = MpeRoomSummary.array();

export type LibraryMpeRoomSearchResponseBody = z.infer<
    typeof LibraryMpeRoomSearchResponseBody
>;

export const ListAllMpeRoomsResponseBody = MpeRoomSummary.array();
export type ListAllMpeRoomsResponseBody = z.infer<
    typeof ListAllMpeRoomsResponseBody
>;
