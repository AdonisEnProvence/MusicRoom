import * as z from 'zod';

export const MpeRejectAddingTracksRequestBody = z.object({
    roomID: z.string().uuid(),
    deviceID: z.string().uuid(),
});
export type MpeRejectAddingTracksRequestBody = z.infer<
    typeof MpeRejectAddingTracksRequestBody
>;
