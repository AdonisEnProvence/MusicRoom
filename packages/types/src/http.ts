import * as z from 'zod';

export const ZodRoomSettings = z.object({
    id: z.string(),
    name: z.string(),
    users: z.array(z.string()),
});
export type RoomSettings = z.infer<typeof ZodRoomSettings>;

export const REQUEST_HEADER_APP_VERSION_KEY = 'music-room-app-version';
export const REQUEST_HEADER_DEVICE_INFORMATION =
    'music-room-device-information';
export const REQUEST_HEADER_DEVICE_OS = 'music-room-device-os';
