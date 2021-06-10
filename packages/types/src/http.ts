import * as z from 'zod';

export const ZodRoomSettings = z.object({
    id: z.string(),
    name: z.string(),
    users: z.array(z.string()),
});
export type RoomSettings = z.infer<typeof ZodRoomSettings>;
