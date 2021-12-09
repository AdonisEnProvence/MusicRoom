import * as z from 'zod';
import { TrackMetadata } from './mtv';

export const MpeWorkflowState = z.object({
    roomID: z.string().uuid(),
    roomCreatorUserID: z.string().uuid(),
    name: z.string(),
    tracks: z.array(TrackMetadata).nullable(),
    isOpen: z.boolean(),
    isOpenOnlyInvitedUsersCanEdit: z.boolean(),
    usersLength: z.number(),
    //Could calculate that in client every time ?
    playlistTotalDuration: z.number(), //ms
});
export type MpeWorkflowState = z.infer<typeof MpeWorkflowState>;
