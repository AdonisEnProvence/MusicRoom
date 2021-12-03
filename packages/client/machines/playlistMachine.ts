import { ActorRefFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { TrackMetadata } from '@musicroom/types';

const playlistModel = createModel(
    {
        tracks: [] as TrackMetadata[],

        trackToAdd: undefined as TrackMetadata | undefined,
        trackToMove: undefined as
            | { previousIndex: number; nextIndex: number; trackID: string }
            | undefined,
    },
    {
        events: {
            ADD_TRACK: (track: TrackMetadata) => ({ ...track }),
            MOVE_UP_TRACK: (trackID: string) => ({ trackID }),
            MOVE_DOWN_TRACK: (trackID: string) => ({ trackID }),
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

const assignTrackToMoveUp = playlistModel.assign(
    {
        trackToMove: ({ tracks }, { trackID }) => {
            const currentIndex = tracks.findIndex(({ id }) => id === trackID);
            if (currentIndex === -1) {
                return undefined;
            }

            return {
                trackID,
                previousIndex: currentIndex,
                nextIndex: currentIndex - 1,
            };
        },
    },
    'MOVE_UP_TRACK',
);

const assignTrackToMoveDown = playlistModel.assign(
    {
        trackToMove: ({ tracks }, { trackID }) => {
            const currentIndex = tracks.findIndex(({ id }) => id === trackID);
            if (currentIndex === -1) {
                return undefined;
            }

            return {
                trackID,
                previousIndex: currentIndex,
                nextIndex: currentIndex + 1,
            };
        },
    },
    'MOVE_DOWN_TRACK',
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

const assignTrackToMoveToTracksList = playlistModel.assign(
    {
        tracks: ({ tracks, trackToMove }) => {
            if (trackToMove === undefined) {
                return tracks;
            }

            const { previousIndex, nextIndex, trackID } = trackToMove;

            const trackItem = tracks.find(({ id }) => id === trackID);
            if (trackItem === undefined) {
                return tracks;
            }

            const tracksCopy = [...tracks];
            tracksCopy.splice(previousIndex, 1);
            tracksCopy.splice(nextIndex, 0, trackItem);

            return tracksCopy;
        },
        trackToMove: undefined,
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

                    MOVE_DOWN_TRACK: {
                        cond: ({ tracks }, { trackID }) => {
                            const trackIndex = tracks.findIndex(
                                ({ id }) => id === trackID,
                            );
                            if (trackIndex === undefined) {
                                return false;
                            }

                            const isLastTrackInList =
                                trackIndex === tracks.length - 1;
                            const isNotLastTrackInList =
                                isLastTrackInList === false;
                            const canMoveTrackDown =
                                isNotLastTrackInList === true;

                            return canMoveTrackDown === true;
                        },

                        target: 'movingTrack',

                        actions: assignTrackToMoveDown,
                    },

                    MOVE_UP_TRACK: {
                        cond: ({ tracks }, { trackID }) => {
                            const trackIndex = tracks.findIndex(
                                ({ id }) => id === trackID,
                            );
                            if (trackIndex === undefined) {
                                return false;
                            }

                            const isFirstTrackInList = trackIndex === 0;
                            const isNotFirstTrackinList =
                                isFirstTrackInList === false;
                            const canMoveTrackUp =
                                isNotFirstTrackinList === true;

                            return canMoveTrackUp === true;
                        },

                        target: 'movingTrack',

                        actions: assignTrackToMoveUp,
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

            movingTrack: {
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

                                actions: assignTrackToMoveToTracksList,
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
