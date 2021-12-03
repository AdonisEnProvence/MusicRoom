import * as z from 'zod';
import {
    MtvRoomUsersListRawElementFromTemporal,
    MtvWorkflowStateWithUserRelatedInformation,
} from './mtv';

export const MtvCreateWorkflowResponse = z.object({
    state: MtvWorkflowStateWithUserRelatedInformation,
    workflowID: z.string(),
    runID: z.string(),
});
export type MtvCreateWorkflowResponse = z.infer<
    typeof MtvCreateWorkflowResponse
>;

export const MtvTemporalGetStateQueryResponse =
    MtvRoomUsersListRawElementFromTemporal.array();
export type MtvTemporalGetStateQueryResponse = z.infer<
    typeof MtvTemporalGetStateQueryResponse
>;
