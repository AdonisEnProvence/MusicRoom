import * as z from 'zod';
import {
    MtvPlayingModes,
    MtvRoomSummary,
    MtvRoomUsersListElement,
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from './mtv';

export const MAX_CHAT_MESSAGE_LENGTH = 255;

export function normalizeChatMessage(message: string): string {
    return message.trim();
}

export const MtvRoomChatMessage = z.object({
    id: z.string(),
    authorID: z.string(),
    authorName: z.string(),
    text: z.string(),
});
export type MtvRoomChatMessage = z.infer<typeof MtvRoomChatMessage>;

export interface MtvRoomChatClientToServerNewMessageArgs {
    message: string;
}

export interface MtvRoomChatServerToClientReceivedMessageArgs {
    message: MtvRoomChatMessage;
}

export interface MtvRoomChatClientToServerEvents {
    NEW_MESSAGE: (args: MtvRoomChatClientToServerNewMessageArgs) => void;
}

export interface MtvRoomChatServerToClientEvents {
    RECEIVED_MESSAGE: (
        args: MtvRoomChatServerToClientReceivedMessageArgs,
    ) => void;
}

export interface MtvRoomClientToServerJoin {
    roomID: string;
}

export const MtvRoomPhysicalAndTimeConstraints = z.object({
    physicalConstraintPlaceID: z.string(),
    physicalConstraintRadius: z.number().positive(),
    physicalConstraintStartsAt: z.string(),
    physicalConstraintEndsAt: z.string(),
});

export type MtvRoomPhysicalAndTimeConstraints = z.infer<
    typeof MtvRoomPhysicalAndTimeConstraints
>;

export const MtvRoomClientToServerCreateArgs = z.object({
    name: z.string(),
    initialTracksIDs: z.string().array(),
    isOpen: z.boolean(),
    minimumScoreToBePlayed: z.number().positive().int(),
    isOpenOnlyInvitedUsersCanVote: z.boolean(),
    hasPhysicalAndTimeConstraints: z.boolean(),
    physicalAndTimeConstraints: MtvRoomPhysicalAndTimeConstraints.optional(),
    playingMode: MtvPlayingModes,
});

export type MtvRoomClientToServerCreateArgs = z.infer<
    typeof MtvRoomClientToServerCreateArgs
>;

export interface MtvRoomClientToServerSuggestTracks {
    tracksToSuggest: string[];
}

export const MtvRoomUpdateDelegationOwnerArgs = z.object({
    newDelegationOwnerUserID: z.string(),
});

export type MtvRoomUpdateDelegationOwnerArgs = z.infer<
    typeof MtvRoomUpdateDelegationOwnerArgs
>;

export const MtvRoomUpdateControlAndDelegationPermissionArgs = z.object({
    toUpdateUserID: z.string().uuid(),
    hasControlAndDelegationPermission: z.boolean(),
});
export type MtvRoomUpdateControlAndDelegationPermissionArgs = z.infer<
    typeof MtvRoomUpdateControlAndDelegationPermissionArgs
>;

export const MtvRoomCreatorInviteUserArgs = z.object({
    invitedUserID: z.string().uuid(),
});
export type MtvRoomCreatorInviteUserArgs = z.infer<
    typeof MtvRoomCreatorInviteUserArgs
>;

export interface Track {
    name: string;
    artistName: string;
}

export interface MtvRoomClientToServerChangeUserEmittingDevice {
    newEmittingDeviceID: string;
}

export interface MtvRoomClientToServerVoteForTrackArgs {
    trackID: string;
}

export interface MtvRoomClientToServerEvents {
    CREATE_ROOM: (args: MtvRoomClientToServerCreateArgs) => void;
    JOIN_ROOM: (args: MtvRoomClientToServerJoin) => void;
    LEAVE_ROOM: () => void;
    ACTION_PLAY: () => void;
    GET_CONTEXT: () => void;
    ACTION_PAUSE: () => void;
    VOTE_FOR_TRACK: (args: MtvRoomClientToServerVoteForTrackArgs) => void;
    GET_USERS_LIST: (
        callback: (usersList: MtvRoomUsersListElement[]) => void,
    ) => void;
    GO_TO_NEXT_TRACK: () => void;
    CHANGE_EMITTING_DEVICE: (
        args: MtvRoomClientToServerChangeUserEmittingDevice,
    ) => void;
    SUGGEST_TRACKS: (args: MtvRoomClientToServerSuggestTracks) => void;
    UPDATE_DELEGATION_OWNER: (args: MtvRoomUpdateDelegationOwnerArgs) => void;
    UPDATE_CONTROL_AND_DELEGATION_PERMISSION: (
        args: MtvRoomUpdateControlAndDelegationPermissionArgs,
    ) => void;
    CREATOR_INVITE_USER: (args: MtvRoomCreatorInviteUserArgs) => void;
}

export interface MtvRoomServerToClientEvents {
    USER_LENGTH_UPDATE: (state: MtvWorkflowState) => void;
    CREATE_ROOM_SYNCHED_CALLBACK: (state: MtvWorkflowState) => void;
    RETRIEVE_CONTEXT: (state: MtvWorkflowState) => void;
    ACTION_PLAY_CALLBACK: (state: MtvWorkflowState) => void;
    ACTION_PAUSE_CALLBACK: (state: MtvWorkflowState) => void;
    CREATE_ROOM_CALLBACK: (state: MtvWorkflowState) => void;
    FORCED_DISCONNECTION: () => void;
    VOTE_OR_SUGGEST_TRACK_CALLBACK: (
        state: MtvWorkflowStateWithUserRelatedInformation,
    ) => void;
    JOIN_ROOM_CALLBACK: (state: MtvWorkflowState) => void;
    CHANGE_EMITTING_DEVICE_CALLBACK: (state: MtvWorkflowState) => void;
    VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE: (state: MtvWorkflowState) => void;
    SUGGEST_TRACKS_CALLBACK: () => void;
    SUGGEST_TRACKS_FAIL_CALLBACK: () => void;
    UPDATE_DELEGATION_OWNER_CALLBACK: (state: MtvWorkflowState) => void;
    USER_PERMISSIONS_UPDATE: (
        state: MtvWorkflowStateWithUserRelatedInformation,
    ) => void;
    USERS_LIST_FORCED_REFRESH: () => void;
    RECEIVED_MTV_ROOM_INVITATION: (payload: MtvRoomSummary) => void;
    TIME_CONSTRAINT_UPDATE: (state: MtvWorkflowState) => void;
    LEAVE_ROOM_CALLBACK: () => void;
}
