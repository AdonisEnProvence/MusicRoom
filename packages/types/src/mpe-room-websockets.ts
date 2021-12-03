import * as z from 'zod';
import { MpeWorkflowState } from '.';

export const MpeRoomClientToServerCreateArgs = z.object({
    name: z.string(),
    initialTrackID: z.string(),
    isOpen: z.boolean(),
    isOpenOnlyInvitedUsersCanVote: z.boolean(),
});

export type MpeRoomClientToServerCreateArgs = z.infer<
    typeof MpeRoomClientToServerCreateArgs
>;

export interface MpeRoomClientToServerEvents {
    MPE_CREATE_ROOM: (args: MpeRoomClientToServerCreateArgs) => void;
}

export interface MpeRoomServerToClientEvents {
    MPE_CREATE_ROOM_SYNCED_CALLBACK: (args: MpeWorkflowState) => void;
}
