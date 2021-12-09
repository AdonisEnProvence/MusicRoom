import * as z from 'zod';
import { MpeWorkflowState } from './mpe';

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

export interface MpeRoomClientToServerEvents {
    MPE_CREATE_ROOM: (args: MpeRoomClientToServerCreateArgs) => void;
    MPE_ADD_TRACKS: (args: MpeRoomClientToServerAddTracksArgs) => void;
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
}
