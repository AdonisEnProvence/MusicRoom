import { ActorRefFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { TrackMetadata } from '@musicroom/types';

const playlistModel = createModel(
    {
        tracks: [] as TrackMetadata[],

        trackToAdd: undefined as TrackMetadata | undefined,
    },
    {
        events: {
            ADD_TRACK: (track: TrackMetadata) => ({ ...track }),
        },
        actions: {},
    },
);

const assignTrackToAdd = playlistModel.assign(
    {
        trackToAdd: (_, { id, title, artistName, duration }) => ({
            id,
            title,
            artistName,
            duration,
        }),
    },
    'ADD_TRACK',
);

const assignTrackToTracksList = playlistModel.assign(
    {
        tracks: ({ tracks, trackToAdd }) => {
            if (trackToAdd === undefined) {
                return tracks;
            }

            return [...tracks, trackToAdd];
        },
        trackToAdd: undefined,
    },
    undefined,
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
                        target: 'addingTrack',

                        actions: assignTrackToAdd,
                    },
                },
            },

            addingTrack: {
                tags: 'freezeUi',

                initial: 'sendingToServer',

                states: {
                    sendingToServer: {
                        after: {
                            200: {
                                target: 'waitingForServerAcknowledgement',
                            },
                        },
                    },

                    waitingForServerAcknowledgement: {
                        after: {
                            200: {
                                target: 'debouncing',

                                actions: assignTrackToTracksList,
                            },
                        },
                    },

                    debouncing: {
                        after: {
                            200: {
                                target: 'end',
                            },
                        },
                    },

                    end: {
                        type: 'final',
                    },
                },

                onDone: {
                    target: 'idle',
                },
            },
        },
    });
}
