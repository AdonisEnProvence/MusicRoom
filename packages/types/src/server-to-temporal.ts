import * as z from 'zod';
import { MtvWorkflowState, TracksMetadata } from './mtv';

export const CreateWorkflowResponse = z.object({
    state: MtvWorkflowState.extend({
        tracks: z.array(TracksMetadata).nullable(),
    }),
    workflowID: z.string(),
    runID: z.string(),
});
export type CreateWorkflowResponse = z.infer<typeof CreateWorkflowResponse>;
