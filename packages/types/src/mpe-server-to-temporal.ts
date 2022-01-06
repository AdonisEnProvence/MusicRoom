import * as z from 'zod';
import { MtvRoomCreationOptionsWithoutInitialTracksIDs } from './mpe-room-websockets';
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

export const MpeChangeTrackOrderOperationToApply = z.enum(['UP', 'DOWN']);
export type MpeChangeTrackOrderOperationToApply = z.infer<
    typeof MpeChangeTrackOrderOperationToApply
>;

export const MpeChangeTrackOrderRequestBody = z.object({
    workflowID: z.string(),
    trackID: z.string(),
    fromIndex: z.number().min(0),
    userID: z.string(),
    deviceID: z.string(),
    operationToApply: MpeChangeTrackOrderOperationToApply,
});
export type MpeChangeTrackOrderRequestBody = z.infer<
    typeof MpeChangeTrackOrderRequestBody
>;

export const MpeChangeTrackOrderResponseBody = z.object({
    ok: z.literal(1),
});
export type MpeChangeTrackOrderResponseBody = z.infer<
    typeof MpeChangeTrackOrderResponseBody
>;

export const MpeJoinRequestBody = z.object({
    workflowID: z.string(),
    userID: z.string(),
    userHasBeenInvited: z.boolean(),
});
export type MpeJoinRequestBody = z.infer<typeof MpeJoinRequestBody>;

export const MpeJoinResponseBody = z.object({
    ok: z.literal(1),
});
export type MpeJoinResponseBody = z.infer<typeof MpeJoinResponseBody>;

export const MpeDeleteTracksRequestBody = z.object({
    workflowID: z.string(),
    tracksIDs: z.array(z.string()).min(1),
    userID: z.string(),
    deviceID: z.string(),
});
export type MpeDeleteTracksRequestBody = z.infer<
    typeof MpeDeleteTracksRequestBody
>;

export const MpeDeleteTracksResponseBody = z.object({
    ok: z.literal(1),
});
export type MpeDeleteTracksResponseBody = z.infer<
    typeof MpeDeleteTracksResponseBody
>;

export const MpeGetStateQueryResponseBody = z.object({
    workflowID: z.string().uuid(),
    state: MpeWorkflowState,
});
export type MpeGetStateQueryResponseBody = z.infer<
    typeof MpeGetStateQueryResponseBody
>;

export const MpeGetStateQueryRequestBody = z.object({
    workflowID: z.string().uuid(),
});
export type MpeGetStateQueryRequestBody = z.infer<
    typeof MpeGetStateQueryRequestBody
>;

export const MpeExportToMtvRequestBody = z.object({
    workflowID: z.string().uuid(),
    userID: z.string(),
    deviceID: z.string(),
    mtvRoomOptions: MtvRoomCreationOptionsWithoutInitialTracksIDs,
});
export type MpeExportToMtvRequestBody = z.infer<
    typeof MpeExportToMtvRequestBody
>;

export const MpeExportToMtvResponseBody = z.object({
    ok: z.literal(1),
});
export type MpeExportToMtvResponseBody = z.infer<
    typeof MpeExportToMtvResponseBody
>;

export const MpeLeaveWorkflowRequestBody = z.object({
    workflowID: z.string().uuid(),
    userID: z.string().uuid(),
});
export type MpeLeaveWorkflowRequestBody = z.infer<
    typeof MpeLeaveWorkflowRequestBody
>;

export const MpeLeaveWorkflowResponseBody = z.object({
    ok: z.literal(1),
});
export type MpeLeaveWorkflowResponseBody = z.infer<
    typeof MpeLeaveWorkflowResponseBody
>;

export const MpeTerminateWorkflowRequestBody = z.object({
    workflowID: z.string().uuid(),
});
export type MpeTerminateWorkflowRequestBody = z.infer<
    typeof MpeTerminateWorkflowRequestBody
>;

export const MpeTerminateWorkflowResponseBody = z.object({
    ok: z.literal(1),
});
export type MpeTerminateWorkflowResponseBody = z.infer<
    typeof MpeTerminateWorkflowResponseBody
>;
