import { z } from 'zod';

export const TrackVoteRoom = z.object({
    roomID: z.string(),
    name: z.string(),
});

export type TrackVoteRoom = z.infer<typeof TrackVoteRoom>;

export const TrackVoteTrack = z.object({
    name: z.string(),
    artistName: z.string(),
});

export type TrackVoteTrack = z.infer<typeof TrackVoteTrack>;

export const TrackVoteUser = z.object({
    userID: z.string(),
    role: z.literal('admin').or(z.literal('member')),
    emitterDeviceID: z.string().optional(),
});

export type TrackVoteUser = z.infer<typeof TrackVoteUser>;

export const AppMusicPlayerMachineContext = z.object({
    currentRoom: TrackVoteRoom.optional(),
    currentTrack: TrackVoteTrack.optional(),
    waitingRoomID: z.string().optional(),
    currentTrackDuration: z.number(),
    currentTrackElapsedTime: z.number(),
    users: TrackVoteUser.array().optional(), //optionnal for dev purpose only TODO this will become require when it'll be dev temporal side
});

export type AppMusicPlayerMachineContext = z.infer<
    typeof AppMusicPlayerMachineContext
>;
