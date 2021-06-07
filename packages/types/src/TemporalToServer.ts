import * as z from 'zod';

export const ZodCreateWorkflow = z.object({
    state: z.string(),
    workflowID: z.string(),
    runID: z.string(),
});
export type CreateWorkflowResponse = z.infer<typeof ZodCreateWorkflow>;
