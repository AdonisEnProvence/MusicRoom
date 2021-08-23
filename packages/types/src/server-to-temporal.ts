import * as z from 'zod';
import { MtvWorkflowStateWithUserRelatedInformation } from './mtv';

export const CreateWorkflowResponse = z.object({
    state: MtvWorkflowStateWithUserRelatedInformation,
    workflowID: z.string(),
    runID: z.string(),
});
export type CreateWorkflowResponse = z.infer<typeof CreateWorkflowResponse>;
