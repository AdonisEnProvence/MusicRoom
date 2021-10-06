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
    hasControlAndDelegationPermission: z.boolean(),
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
    delegationOwnerUserID: z.string().nullable(),
});

export type MtvWorkflowState = z.infer<typeof MtvWorkflowState>;

export const MtvWorkflowStateWithUserRelatedInformation =
    MtvWorkflowState.extend({
        userRelatedInformation: UserRelatedInformation,
    });
export type MtvWorkflowStateWithUserRelatedInformation = z.infer<
    typeof MtvWorkflowStateWithUserRelatedInformation
>;

export const MtvRoomUsersListRawElementFromTemporal = z.object({
    userID: z.string().uuid(),
    isCreator: z.boolean(),
    isDelegationOwner: z.boolean(),
    hasControlAndDelegationPermission: z.boolean(),
});
export type MtvRoomUsersListRawElementFromTemporal = z.infer<
    typeof MtvRoomUsersListRawElementFromTemporal
>;

export const MtvRoomUsersListElement =
    MtvRoomUsersListRawElementFromTemporal.extend({
        isMe: z.boolean(),
        nickname: z.string(),
        avatar: z.string().optional(), //TODO
    });
export type MtvRoomUsersListElement = z.infer<typeof MtvRoomUsersListElement>;
