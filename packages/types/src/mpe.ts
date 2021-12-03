import * as z from 'zod';
import { TrackMetadataWithScore } from './mtv';

export const MpeWorkflowState = z.object({
    roomID: z.string().uuid(),
    roomCreatorUserID: z.string().uuid(),
    name: z.string(),
    tracks: z.array(TrackMetadataWithScore).nullable(),
    isOpen: z.boolean(),
    isOpenOnlyInvitedUsersCanVote: z.boolean(),
    usersLength: z.number(),
    //Could calculate that in client every time ?
    playlistTotalDuration: z.number(), //ms
    playlistTracksLength: z.number(),
});
export type MpeWorkflowState = z.infer<typeof MpeWorkflowState>;
