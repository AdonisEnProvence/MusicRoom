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

export const MtvWorkflowState = z.object({
    roomID: z.string().uuid(),
    roomCreatorUserID: z.string().uuid(),
    playing: z.boolean(),
    name: z.string(),
    users: z.array(z.string()),
    currentTrack: CurrentTrack.nullable(),
    tracksIDsList: z.string().array().nullable(),
    tracks: z.array(TracksMetadata).nullable(),
});

export type MtvWorkflowState = z.infer<typeof MtvWorkflowState>;
