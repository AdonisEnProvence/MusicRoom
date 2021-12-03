import * as z from 'zod';
import { MpeWorkflowState } from './mpe';

export const MpeCreateWorkflowResponse = z.object({
    state: MpeWorkflowState,
    workflowID: z.string(),
    runID: z.string(),
});
export type MpeCreateWorkflowResponse = z.infer<
    typeof MpeCreateWorkflowResponse
>;
