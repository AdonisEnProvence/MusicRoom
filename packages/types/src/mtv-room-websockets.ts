import * as z from 'zod';
import {
    MtvPlayingModes,
    MtvRoomUsersListElement,
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from './mtv';

export interface ChatMessage {
    author: string;
    text: string;
}

export interface ChatClientToServerNewMessageArgs {
    message: ChatMessage;
}

export interface ChatServerToClientLoadMessagesArgs {
    messages: ChatMessage[];
}

export interface ChatServerToClientReceivedMessageArgs {
    message: ChatMessage;
}

export interface ChatClientToServerEvents {
    NEW_MESSAGE: (args: ChatClientToServerNewMessageArgs) => void;
}

export interface ChatServerToClientEvents {
    LOAD_MESSAGES: (args: ChatServerToClientLoadMessagesArgs) => void;
    RECEIVED_MESSAGE: (args: ChatServerToClientReceivedMessageArgs) => void;
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
}

export interface MtvRoomServerToClientEvents {
    USER_LENGTH_UPDATE: (state: MtvWorkflowState) => void;
    CREATE_ROOM_SYNCHED_CALLBACK: (state: MtvWorkflowState) => void;
    RETRIEVE_CONTEXT: (state: MtvWorkflowState) => void;
    ACTION_PLAY_CALLBACK: (state: MtvWorkflowState) => void;
    ACTION_PAUSE_CALLBACK: () => void;
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
}
