import * as z from 'zod';
import { MpeWorkflowState } from './mpe';

export const MpeRejectAddingTracksRequestBody = z.object({
    roomID: z.string().uuid(),
    userID: z.string().uuid(),
    deviceID: z.string().uuid(),
});
export type MpeRejectAddingTracksRequestBody = z.infer<
    typeof MpeRejectAddingTracksRequestBody
>;

export const MpeAcknowledgeAddingTracksRequestBody = z.object({
    state: MpeWorkflowState,
    userID: z.string().uuid(),
    deviceID: z.string().uuid(),
});
export type MpeAcknowledgeAddingTracksRequestBody = z.infer<
    typeof MpeAcknowledgeAddingTracksRequestBody
>;

export const MpeAcknowledgeChangeTrackOrderRequestBody = z.object({
    state: MpeWorkflowState,
    userID: z.string().uuid(),
    deviceID: z.string().uuid(),
});
export type MpeAcknowledgeChangeTrackOrderRequestBody = z.infer<
    typeof MpeAcknowledgeChangeTrackOrderRequestBody
>;

export const MpeRejectChangeTrackOrderRequestBody = z.object({
    roomID: z.string().uuid(),
    userID: z.string().uuid(),
    deviceID: z.string().uuid(),
});
export type MpeRejectChangeTrackOrderRequestBody = z.infer<
    typeof MpeRejectChangeTrackOrderRequestBody
>;

export const MpeAcknowledgeDeletingTracksRequestBody = z.object({
    state: MpeWorkflowState,
    userID: z.string().uuid(),
    deviceID: z.string().uuid(),
});
export type MpeAcknowledgeDeletingTracksRequestBody = z.infer<
    typeof MpeAcknowledgeDeletingTracksRequestBody
>;

export const MpeAcknowledgeJoinRequestBody = z.object({
    state: MpeWorkflowState,
    joiningUserID: z.string().uuid(),
});
export type MpeAcknowledgeJoinRequestBody = z.infer<
    typeof MpeAcknowledgeJoinRequestBody
>;
