import * as z from 'zod';
import {
    MtvPlayingModes,
    MtvRoomSummary,
    MtvRoomUsersListElement,
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from './mtv';
import { LatlngCoords } from './user-websockets';

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
    MTV_NEW_MESSAGE: (args: MtvRoomChatClientToServerNewMessageArgs) => void;
}

export interface MtvRoomChatServerToClientEvents {
    MTV_RECEIVED_MESSAGE: (
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

export const MtvRoomGetRoomConstraintDetailsCallbackArgs =
    MtvRoomPhysicalAndTimeConstraints.omit({
        physicalConstraintPlaceID: true,
    }).extend({
        roomID: z.string(),
        physicalConstraintPosition: LatlngCoords,
    });

export type MtvRoomGetRoomConstraintDetailsCallbackArgs = z.infer<
    typeof MtvRoomGetRoomConstraintDetailsCallbackArgs
>;

export interface MtvRoomClientToServerEvents {
    MTV_CREATE_ROOM: (args: MtvRoomClientToServerCreateArgs) => void;
    MTV_JOIN_ROOM: (args: MtvRoomClientToServerJoin) => void;
    MTV_LEAVE_ROOM: () => void;
    MTV_ACTION_PLAY: () => void;
    MTV_GET_CONTEXT: () => void;
    MTV_ACTION_PAUSE: () => void;
    MTV_VOTE_FOR_TRACK: (args: MtvRoomClientToServerVoteForTrackArgs) => void;
    MTV_GET_USERS_LIST: (
        callback: (usersList: MtvRoomUsersListElement[]) => void,
    ) => void;
    MTV_GO_TO_NEXT_TRACK: () => void;
    MTV_CHANGE_EMITTING_DEVICE: (
        args: MtvRoomClientToServerChangeUserEmittingDevice,
    ) => void;
    MTV_SUGGEST_TRACKS: (args: MtvRoomClientToServerSuggestTracks) => void;
    MTV_UPDATE_DELEGATION_OWNER: (
        args: MtvRoomUpdateDelegationOwnerArgs,
    ) => void;
    MTV_UPDATE_CONTROL_AND_DELEGATION_PERMISSION: (
        args: MtvRoomUpdateControlAndDelegationPermissionArgs,
    ) => void;
    MTV_CREATOR_INVITE_USER: (args: MtvRoomCreatorInviteUserArgs) => void;

    MTV_GET_ROOM_CONSTRAINTS_DETAILS: (
        cb: (payload: MtvRoomGetRoomConstraintDetailsCallbackArgs) => void,
    ) => void;
}

export interface MtvRoomServerToClientEvents {
    MTV_USER_LENGTH_UPDATE: (state: MtvWorkflowState) => void;
    MTV_CREATE_ROOM_SYNCHED_CALLBACK: (state: MtvWorkflowState) => void;
    MTV_RETRIEVE_CONTEXT: (state: MtvWorkflowState) => void;
    MTV_ACTION_PLAY_CALLBACK: (state: MtvWorkflowState) => void;
    MTV_ACTION_PAUSE_CALLBACK: (state: MtvWorkflowState) => void;
    MTV_CREATE_ROOM_CALLBACK: (state: MtvWorkflowState) => void;
    MTV_FORCED_DISCONNECTION: () => void;
    MTV_VOTE_OR_SUGGEST_TRACK_CALLBACK: (
        state: MtvWorkflowStateWithUserRelatedInformation,
    ) => void;
    MTV_JOIN_ROOM_CALLBACK: (state: MtvWorkflowState) => void;
    MTV_CHANGE_EMITTING_DEVICE_CALLBACK: (state: MtvWorkflowState) => void;
    MTV_VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE: (state: MtvWorkflowState) => void;
    MTV_SUGGEST_TRACKS_CALLBACK: () => void;
    MTV_SUGGEST_TRACKS_FAIL_CALLBACK: () => void;
    MTV_UPDATE_DELEGATION_OWNER_CALLBACK: (state: MtvWorkflowState) => void;
    MTV_USER_PERMISSIONS_UPDATE: (
        state: MtvWorkflowStateWithUserRelatedInformation,
    ) => void;
    MTV_USERS_LIST_FORCED_REFRESH: () => void;
    MTV_RECEIVED_ROOM_INVITATION: (payload: MtvRoomSummary) => void;
    MTV_TIME_CONSTRAINT_UPDATE: (state: MtvWorkflowState) => void;
    MTV_LEAVE_ROOM_CALLBACK: () => void;
}
