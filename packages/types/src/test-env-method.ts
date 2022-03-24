import * as z from 'zod';

export const ToggleMailTrafRequestBody = z.object({
    status: z.enum(['ENABLE', 'DISABLE']),
});
export type ToggleMailTrafRequestBody = z.infer<
    typeof ToggleMailTrafRequestBody
>;
