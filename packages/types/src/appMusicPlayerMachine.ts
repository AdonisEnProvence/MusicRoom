import * as z from 'zod';
import { MtvWorkflowState } from './mtv';

export const AppMusicPlayerMachineContext = MtvWorkflowState;

export type AppMusicPlayerMachineContext = z.infer<
    typeof AppMusicPlayerMachineContext
>;
