import * as z from 'zod';
import { MtvWorkflowState } from './mtv';

export const CreateWorkflowResponse = z.object({
    state: MtvWorkflowState,
    workflowID: z.string(),
    runID: z.string(),
});
export type CreateWorkflowResponse = z.infer<typeof CreateWorkflowResponse>;
