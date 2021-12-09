import * as z from 'zod';
import { MpeWorkflowState } from './mpe';

export const MpeRejectAddingTracksRequestBody = z.object({
    roomID: z.string().uuid(),
    deviceID: z.string().uuid(),
});
export type MpeRejectAddingTracksRequestBody = z.infer<
    typeof MpeRejectAddingTracksRequestBody
>;

export const MpeAcknowledgeAddingTracksRequestBody = z.object({
    state: MpeWorkflowState,
    deviceID: z.string().uuid(),
});
export type MpeAcknowledgeAddingTracksRequestBody = z.infer<
    typeof MpeAcknowledgeAddingTracksRequestBody
>;
