import * as z from 'zod';

const Milliseconds = z.number().nonnegative();

export const TrackMetadata = z.object({
    id: z.string(),
    title: z.string(),
    artistName: z.string(),
    duration: Milliseconds,
});
export type TrackMetadata = z.infer<typeof TrackMetadata>;

export const TrackMetadataWithScore = TrackMetadata.extend({
    score: z.number(),
});
export type TrackMetadataWithScore = z.infer<typeof TrackMetadataWithScore>;

export const CurrentTrack = TrackMetadataWithScore.extend({
    elapsed: Milliseconds,
});
export type CurrentTrack = z.infer<typeof CurrentTrack>;

export const UserRelatedInformation = z.object({
    userID: z.string(),
    emittingDeviceID: z.string(),
    tracksVotedFor: z.string().array(),
    userFitsPositionConstraint: z.boolean().nullable(),
});
export type UserRelatedInformation = z.infer<typeof UserRelatedInformation>;

export const MtvPlayingModes = z.enum(['DIRECT', 'BROADCAST']);
export type MtvPlayingModes = z.infer<typeof MtvPlayingModes>;

export const MtvWorkflowState = z.object({
    roomID: z.string().uuid(),
    roomCreatorUserID: z.string().uuid(),
    playing: z.boolean(),
    name: z.string(),
    userRelatedInformation: UserRelatedInformation.nullable(),
    playingMode: MtvPlayingModes,
    usersLength: z.number(),
    currentTrack: CurrentTrack.nullable(),
    tracks: z.array(TrackMetadataWithScore).nullable(),
    minimumScoreToBePlayed: z.number(),
    hasTimeAndPositionConstraints: z.boolean(),
    timeConstraintIsValid: z.boolean().nullable(),
    isOpen: z.boolean(),
    isOpenOnlyInvitedUsersCanVote: z.boolean(),
});

export type MtvWorkflowState = z.infer<typeof MtvWorkflowState>;

export const MtvWorkflowStateWithUserRelatedInformation =
    MtvWorkflowState.extend({
        userRelatedInformation: UserRelatedInformation,
    });
export type MtvWorkflowStateWithUserRelatedInformation = z.infer<
    typeof MtvWorkflowStateWithUserRelatedInformation
>;
