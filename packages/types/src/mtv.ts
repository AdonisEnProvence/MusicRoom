import * as z from 'zod';

export const ISO8601Duration = z
    .string()
    .refine((duration) => duration.startsWith('P'), {
        message: 'ISO8601 duration must begin with P',
    });
export type ISO8601Duration = z.infer<typeof ISO8601Duration>;

export const TracksMetadata = z.object({
    id: z.string(),
    title: z.string(),
    artistName: z.string(),
    duration: ISO8601Duration,
});
export type TracksMetadata = z.infer<typeof TracksMetadata>;

export const MtvWorkflowState = z
    .object({
        playing: z.boolean(),
        name: z.string(),
        users: z.array(z.string()),
        tracks: z.array(TracksMetadata),
    })
    .nonstrict();
export type MtvWorkflowState = z.infer<typeof MtvWorkflowState>;
