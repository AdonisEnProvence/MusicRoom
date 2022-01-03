import * as z from 'zod';
import { MpeWorkflowState, MpeRoomSummary } from './mpe';

//Client to server
export const MpeRoomClientToServerCreateArgs = z.object({
    name: z.string(),
    initialTrackID: z.string(),
    isOpen: z.boolean(),
    isOpenOnlyInvitedUsersCanEdit: z.boolean(),
});

export type MpeRoomClientToServerCreateArgs = z.infer<
    typeof MpeRoomClientToServerCreateArgs
>;

export const MpeRoomClientToServerAddTracksArgs = z.object({
    roomID: z.string().uuid(),
    tracksIDs: z.array(z.string()).min(1),
});
export type MpeRoomClientToServerAddTracksArgs = z.infer<
    typeof MpeRoomClientToServerAddTracksArgs
>;

export const MpeRoomClientToServerDeleteTracksArgs = z.object({
    roomID: z.string().uuid(),
    tracksIDs: z.array(z.string()).min(1),
});
export type MpeRoomClientToServerDeleteTracksArgs = z.infer<
    typeof MpeRoomClientToServerDeleteTracksArgs
>;

export const MpeRoomServerToClientAddTracksFailCallbackArgs = z.object({
    roomID: z.string().uuid(),
});
export type MpeRoomServerToClientAddTracksFailCallbackArgs = z.infer<
    typeof MpeRoomServerToClientAddTracksFailCallbackArgs
>;

export const MpeRoomServerToClientTracksListUpdateArgs = z.object({
    roomID: z.string().uuid(),
    state: MpeWorkflowState,
});
export type MpeRoomServerToClientTracksListUpdateArgs = z.infer<
    typeof MpeRoomServerToClientTracksListUpdateArgs
>;

export const MpeRoomServerToClientTracksSuccessCallbackArgs = z.object({
    roomID: z.string().uuid(),
    state: MpeWorkflowState,
});
export type MpeRoomServerToClientTracksSuccessCallbackArgs = z.infer<
    typeof MpeRoomServerToClientTracksSuccessCallbackArgs
>;

export const MpeRoomClientToServerChangeTrackOrderUpDownArgs = z.object({
    roomID: z.string().uuid(),
    trackID: z.string(),
    fromIndex: z.number().min(0),
});
export type MpeRoomClientToServerChangeTrackOrderUpDownArgs = z.infer<
    typeof MpeRoomClientToServerChangeTrackOrderUpDownArgs
>;

export const MpeRoomClientToServerJoinRoomArgs = z.object({
    roomID: z.string().uuid(),
});
export type MpeRoomClientToServerJoinRoomArgs = z.infer<
    typeof MpeRoomClientToServerJoinRoomArgs
>;

export const MpeRoomClientToServerLeaveRoomArgs = z.object({
    roomID: z.string().uuid(),
});
export type MpeRoomClientToServerLeaveRoomArgs = z.infer<
    typeof MpeRoomClientToServerLeaveRoomArgs
>;
///

//Server to client
export const MpeRoomServerToClientChangeTrackFailCallbackArgs = z.object({
    roomID: z.string().uuid(),
});
export type MpeRoomServerToClientChangeTrackFailCallbackArgs = z.infer<
    typeof MpeRoomServerToClientChangeTrackFailCallbackArgs
>;

export const MpeRoomServerToClientChangeTrackSuccessCallbackARgs = z.object({
    roomID: z.string().uuid(),
    state: MpeWorkflowState,
});
export type MpeRoomServerToClientChangeTrackSuccessCallbackARgs = z.infer<
    typeof MpeRoomServerToClientChangeTrackSuccessCallbackARgs
>;

export const MpeRoomServerToClientDeleteTracksSuccessCallbackArgs = z.object({
    roomID: z.string().uuid(),
    state: MpeWorkflowState,
});
export type MpeRoomServerToClientDeleteTracksSuccessCallbackArgs = z.infer<
    typeof MpeRoomServerToClientDeleteTracksSuccessCallbackArgs
>;

export const MpeRoomClientToServerGetContextArgs = z.object({
    roomID: z.string().uuid(),
});
export type MpeRoomClientToServerGetContextArgs = z.infer<
    typeof MpeRoomClientToServerGetContextArgs
>;

export const MpeRoomServerToClientGetContextFailCallbackArgs = z.object({
    roomID: z.string().uuid(),
});
export type MpeRoomServerToClientGetContextFailCallbackArgs = z.infer<
    typeof MpeRoomServerToClientGetContextFailCallbackArgs
>;

export const MpeRoomServerToClientGetContextSuccessCallbackArgs = z.object({
    state: MpeWorkflowState,
    roomID: z.string().uuid(),
    userIsNotInRoom: z.boolean(),
});
export type MpeRoomServerToClientGetContextSuccessCallbackArgs = z.infer<
    typeof MpeRoomServerToClientGetContextSuccessCallbackArgs
>;

export const MpeRoomServerToClientJoinRoomCallbackArgs = z.object({
    state: MpeWorkflowState,
    roomID: z.string().uuid(),
    userIsNotInRoom: z.boolean(),
});
export type MpeRoomServerToClientJoinRoomCallbackArgs = z.infer<
    typeof MpeRoomServerToClientJoinRoomCallbackArgs
>;

export const MpeRoomServerToClientUsersLengthUpdateArgs = z.object({
    state: MpeWorkflowState,
    roomID: z.string().uuid(),
});
export type MpeRoomServerToClientUsersLengthUpdateArgs = z.infer<
    typeof MpeRoomServerToClientUsersLengthUpdateArgs
>;

export const MpeRoomServerToClientForcedDisconnectionArgs = z.object({
    roomSummary: MpeRoomSummary,
});
export type MpeRoomServerToClientForcedDisconnectionArgs = z.infer<
    typeof MpeRoomServerToClientForcedDisconnectionArgs
>;

export const MpeRoomServerToClientLeaveRoomCallbackArgs = z.object({
    roomSummary: MpeRoomSummary,
});
export type MpeRoomServerToClientLeaveRoomCallbackArgs = z.infer<
    typeof MpeRoomServerToClientLeaveRoomCallbackArgs
>;
///

export interface MpeRoomClientToServerEvents {
    MPE_CREATE_ROOM: (args: MpeRoomClientToServerCreateArgs) => void;
    MPE_ADD_TRACKS: (args: MpeRoomClientToServerAddTracksArgs) => void;
    MPE_CHANGE_TRACK_ORDER_DOWN: (
        args: MpeRoomClientToServerChangeTrackOrderUpDownArgs,
    ) => void;
    MPE_CHANGE_TRACK_ORDER_UP: (
        args: MpeRoomClientToServerChangeTrackOrderUpDownArgs,
    ) => void;
    MPE_DELETE_TRACKS: (args: MpeRoomClientToServerDeleteTracksArgs) => void;
    MPE_GET_CONTEXT: (args: MpeRoomClientToServerGetContextArgs) => void;
    MPE_JOIN_ROOM: (args: MpeRoomClientToServerJoinRoomArgs) => void;
    MPE_LEAVE_ROOM: (args: MpeRoomClientToServerLeaveRoomArgs) => void;
}

export interface MpeRoomServerToClientEvents {
    MPE_CREATE_ROOM_SYNCED_CALLBACK: (args: MpeWorkflowState) => void;
    MPE_CREATE_ROOM_FAIL: () => void;
    MPE_CREATE_ROOM_CALLBACK: (state: MpeWorkflowState) => void;
    MPE_ADD_TRACKS_FAIL_CALLBACK: (
        args: MpeRoomServerToClientAddTracksFailCallbackArgs,
    ) => void;
    MPE_TRACKS_LIST_UPDATE: (
        args: MpeRoomServerToClientTracksListUpdateArgs,
    ) => void;
    MPE_ADD_TRACKS_SUCCESS_CALLBACK: (
        args: MpeRoomServerToClientTracksSuccessCallbackArgs,
    ) => void;
    MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK: (
        args: MpeRoomServerToClientChangeTrackSuccessCallbackARgs,
    ) => void;
    MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK: (
        args: MpeRoomServerToClientChangeTrackFailCallbackArgs,
    ) => void;
    MPE_DELETE_TRACKS_SUCCESS_CALLBACK: (
        args: MpeRoomServerToClientDeleteTracksSuccessCallbackArgs,
    ) => void;
    MPE_GET_CONTEXT_SUCCESS_CALLBACK: (
        args: MpeRoomServerToClientGetContextSuccessCallbackArgs,
    ) => void;
    MPE_GET_CONTEXT_FAIL_CALLBACK: (
        args: MpeRoomServerToClientGetContextFailCallbackArgs,
    ) => void;
    MPE_JOIN_ROOM_CALLBACK: (
        args: MpeRoomServerToClientJoinRoomCallbackArgs,
    ) => void;
    MPE_USERS_LENGTH_UPDATE: (
        args: MpeRoomServerToClientUsersLengthUpdateArgs,
    ) => void;
    MPE_FORCED_DISCONNECTION: (
        args: MpeRoomServerToClientForcedDisconnectionArgs,
    ) => void;
    MPE_LEAVE_ROOM_CALLBACK: (
        args: MpeRoomServerToClientLeaveRoomCallbackArgs,
    ) => void;
}
