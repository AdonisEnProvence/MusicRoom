import * as z from 'zod';
import { MtvWorkflowState } from './mtv';

export const AppMusicPlayerMachineContext = MtvWorkflowState.extend({
    waitingRoomID: z.string().optional(),
});

export type AppMusicPlayerMachineContext = z.infer<
    typeof AppMusicPlayerMachineContext
>;
