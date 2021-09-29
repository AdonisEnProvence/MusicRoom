import * as z from 'zod';
import { MtvWorkflowStateWithUserRelatedInformation } from './mtv';

export const CreateWorkflowResponse = z.object({
    state: MtvWorkflowStateWithUserRelatedInformation,
    workflowID: z.string(),
    runID: z.string(),
});
export type CreateWorkflowResponse = z.infer<typeof CreateWorkflowResponse>;

export const MtvRoomUsersListRawElementFromTemporal = z.object({
    userID: z.string().uuid(),
    isCreator: z.boolean(),
    isDelegationOwner: z.boolean(),
    hasControlAndDelegationPermission: z.boolean(),
});
export type MtvRoomUsersListRawElementFromTemporal = z.infer<
    typeof MtvRoomUsersListRawElementFromTemporal
>;

export const TemporalGetStateQueryResponse =
    MtvRoomUsersListRawElementFromTemporal.array();
export type TemporalGetStateQueryResponse = z.infer<
    typeof TemporalGetStateQueryResponse
>;
