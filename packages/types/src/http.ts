import * as z from 'zod';

export const ZodRoomSettings = z.object({
    id: z.string(),
    name: z.string(),
    users: z.array(z.string()),
});
export type RoomSettings = z.infer<typeof ZodRoomSettings>;

export const REQUEST_HEADER_APP_VERSION_KEY = 'Music-Room-App-Version';
export const REQUEST_HEADER_DEVICE_INFORMATION =
    'Music-Room-Device-Information';
export const REQUEST_HEADER_DEVICE_OS = 'Music-Room-Device-OS';
