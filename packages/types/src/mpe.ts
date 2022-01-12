import * as z from 'zod';
import { TrackMetadata } from './mtv';

export const MpeUserRelatedInformation = z.object({
    userID: z.string().uuid(),
    userHasBeenInvited: z.boolean(),
});
export type MpeUserRelatedInformation = z.infer<
    typeof MpeUserRelatedInformation
>;

export const MpeWorkflowState = z.object({
    roomID: z.string().uuid(),
    roomCreatorUserID: z.string().uuid(),
    name: z.string(),
    //Tracks can be an empty array, we expect temporal to send back an empty array if necessary
    tracks: z.array(TrackMetadata),
    isOpen: z.boolean(),
    isOpenOnlyInvitedUsersCanEdit: z.boolean(),
    usersLength: z.number(),
    //Could calculate that in client every time ?
    playlistTotalDuration: z.number(), //ms
    userRelatedInformation: z.null(),
});
export type MpeWorkflowState = z.infer<typeof MpeWorkflowState>;

export const PlaylistModelMpeWorkflowState = MpeWorkflowState.extend({
    userRelatedInformation: MpeUserRelatedInformation.nullable(),
});
export type PlaylistModelMpeWorkflowState = z.infer<
    typeof PlaylistModelMpeWorkflowState
>;

export const MpeWorkflowStateWithUserRelatedInformation =
    MpeWorkflowState.extend({
        userRelatedInformation: MpeUserRelatedInformation,
    });
export type MpeWorkflowStateWithUserRelatedInformation = z.infer<
    typeof MpeWorkflowStateWithUserRelatedInformation
>;

export const MpeRoomSummary = z.object({
    roomID: z.string(),
    roomName: z.string(),
    creatorName: z.string(),
    isInvited: z.boolean(),
    isOpen: z.boolean(),
});
export type MpeRoomSummary = z.infer<typeof MpeRoomSummary>;
