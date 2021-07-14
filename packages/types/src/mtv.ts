import * as z from 'zod';

export const TracksMetadata = z.object({
    id: z.string(),
    title: z.string(),
    artistName: z.string(),
    duration: z.number(), //ms
});
export type TracksMetadata = z.infer<typeof TracksMetadata>;

export const CurrentTrack = TracksMetadata.extend({
    elapsed: z.number(), //ms
});
export type CurrentTrack = z.infer<typeof CurrentTrack>;

export const MtvWorkflowState = z
    .object({
        roomID: z.string().uuid(),
        roomCreatorUserID: z.string().uuid(),
        playing: z.boolean(),
        name: z.string(),
        users: z.array(z.string()),
        currentTrack: CurrentTrack.optional().nullable(),
        tracksIDsList: z.string().array().optional().nullable(),
        tracks: z.array(TracksMetadata).optional().nullable(),
    })
    .nonstrict();

export type MtvWorkflowState = z.infer<typeof MtvWorkflowState>;
