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

export const MpeAddTracksRequestBody = z.object({
    workflowID: z.string(),
    tracksIDs: z.array(z.string()).min(1),
    userID: z.string(),
    deviceID: z.string(),
});
export type MpeAddTracksRequestBody = z.infer<typeof MpeAddTracksRequestBody>;

export const MpeAddTracksResponseBody = z.object({
    ok: z.literal(1),
});
export type MpeAddTracksResponseBody = z.infer<typeof MpeAddTracksResponseBody>;
