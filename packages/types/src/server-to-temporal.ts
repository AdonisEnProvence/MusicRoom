import * as z from 'zod';
import {
    MtvRoomUsersListRawElementFromTemporal,
    MtvWorkflowStateWithUserRelatedInformation,
} from './mtv';

export const CreateWorkflowResponse = z.object({
    state: MtvWorkflowStateWithUserRelatedInformation,
    workflowID: z.string(),
    runID: z.string(),
});
export type CreateWorkflowResponse = z.infer<typeof CreateWorkflowResponse>;

export const TemporalGetStateQueryResponse =
    MtvRoomUsersListRawElementFromTemporal.array();
export type TemporalGetStateQueryResponse = z.infer<
    typeof TemporalGetStateQueryResponse
>;
