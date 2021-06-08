import * as z from 'zod';

export const TemporalControlState = z.object({
    name: z.string(),
    users: z.array(z.string()),
    playing: z.boolean(),
});

export type TemporalControlState = z.infer<typeof TemporalControlState>;

export const CreateWorkflowResponse = z.object({
    state: TemporalControlState,
    workflowID: z.string(),
    runID: z.string(),
});
export type CreateWorkflowResponse = z.infer<typeof CreateWorkflowResponse>;
