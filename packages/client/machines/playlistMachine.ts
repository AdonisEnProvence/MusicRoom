import { ActorRefFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { TrackMetadata } from '@musicroom/types';

const playlistModel = createModel(
    {
        tracks: [] as TrackMetadata[],
    },
    {
        events: {
            ADD_TRACK: (track: TrackMetadata) => ({ ...track }),
        },
        actions: {},
    },
);

const assignTrackToTracksList = playlistModel.assign(
    {
        tracks: ({ tracks }, { id, title, artistName, duration }) => [
            ...tracks,
            {
                id,
                title,
                artistName,
                duration,
            },
        ],
    },
    'ADD_TRACK',
);

type PlaylistMachine = ReturnType<typeof playlistModel['createMachine']>;

export type PlaylistActorRef = ActorRefFrom<PlaylistMachine>;

interface CreatePlaylistMachineArgs {
    roomID: string;
}

export function createPlaylistMachine({
    roomID,
}: CreatePlaylistMachineArgs): PlaylistMachine {
    return playlistModel.createMachine({
        initial: 'idle',

        states: {
            idle: {
                on: {
                    ADD_TRACK: {
                        actions: assignTrackToTracksList,
                    },
                },
            },
        },
    });
}
