import { ActorRefFrom, createMachine, sendParent } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { MpeWorkflowState, TrackMetadata } from '@musicroom/types';
import { appMusicPlaylistsModel } from './appMusicPlaylistsMachine';

export const playlistModel = createModel(
    {
        state: {
            isOpenOnlyInvitedUsersCanEdit: false,
            isOpen: true,
            name: '',
            playlistTotalDuration: 0,
            roomCreatorUserID: '',
            roomID: '',
            tracks: [],
            usersLength: 0,
        } as MpeWorkflowState,

        trackIDToAdd: undefined as string | undefined,

        trackToAdd: undefined as TrackMetadata | undefined,
        trackToMove: undefined as
            | { previousIndex: number; nextIndex: number; trackID: string }
            | undefined,
        trackToDelete: undefined as string | undefined,
    },
    {
        events: {
            ADD_TRACK: (trackID: string) => ({ trackID }),
            SENT_TRACK_TO_ADD_TO_SERVER: () => ({}),

            MOVE_UP_TRACK: (trackID: string) => ({ trackID }),
            MOVE_DOWN_TRACK: (trackID: string) => ({ trackID }),
            DELETE_TRACK: (trackID: string) => ({ trackID }),
            ASSIGN_MERGE_NEW_STATE: (state: MpeWorkflowState) => ({ state }),
        },
        actions: {},
    },
);

const assignTrackIDToAdd = playlistModel.assign(
    {
        trackIDToAdd: (_, { trackID }) => trackID,
    },
    'ADD_TRACK',
);

const assignTrackToMoveUp = playlistModel.assign(
    {
        trackToMove: ({ state: { tracks } }, { trackID }) => {
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
        trackToMove: ({ state: { tracks } }, { trackID }) => {
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

const assignTrackToDelete = playlistModel.assign(
    {
        trackToDelete: ({ state: { tracks } }, { trackID }) => {
            const doesTrackExist = tracks.some(({ id }) => id === trackID);
            if (doesTrackExist === false) {
                return undefined;
            }

            return trackID;
        },
    },
    'DELETE_TRACK',
);

const assignMergeNewState = playlistModel.assign(
    {
        state: (context, event) => {
            return {
                ...context.state,
                ...event.state,
            };
        },
    },
    'ASSIGN_MERGE_NEW_STATE',
);

const assignTrackToTracksList = playlistModel.assign(
    {
        state: (context) => {
            const {
                trackToAdd,
                state: { tracks },
            } = context;

            if (trackToAdd === undefined) {
                return context.state;
            }

            return {
                ...context.state,
                tracks: [...tracks, trackToAdd],
            };
        },
        trackToAdd: undefined,
    },
    undefined,
);

const assignTrackToMoveToTracksList = playlistModel.assign(
    {
        state: ({ state, trackToMove }) => {
            const { tracks } = state;
            if (trackToMove === undefined) {
                return state;
            }

            const { previousIndex, nextIndex, trackID } = trackToMove;

            const trackItem = tracks.find(({ id }) => id === trackID);
            if (trackItem === undefined) {
                return state;
            }

            const tracksCopy = [...tracks];
            tracksCopy.splice(previousIndex, 1);
            tracksCopy.splice(nextIndex, 0, trackItem);

            return {
                ...state,
                tracks: tracksCopy,
            };
        },
        trackToMove: undefined,
    },
    undefined,
);

const assignTrackToRemoveToTracksList = playlistModel.assign(
    {
        state: ({ state, trackToDelete }) => {
            const { tracks } = state;
            if (trackToDelete === undefined) {
                return state;
            }

            return {
                ...state,
                tracks: tracks.filter(({ id }) => id !== trackToDelete),
            };
        },
    },
    undefined,
);

type PlaylistMachine = ReturnType<typeof playlistModel['createMachine']>;

export type PlaylistActorRef = ActorRefFrom<PlaylistMachine>;

type CreatePlaylistMachineArgs = MpeWorkflowState;

export function createPlaylistMachine(
    state: CreatePlaylistMachineArgs,
): PlaylistMachine {
    const roomID = state.roomID;

    return createMachine({
        initial: 'idle',

        context: {
            ...playlistModel.initialContext,
            state,
        },

        states: {
            idle: {
                on: {
                    ASSIGN_MERGE_NEW_STATE: {
                        actions: assignMergeNewState,
                    },

                    ADD_TRACK: {
                        target: 'addingTrack',

                        actions: assignTrackIDToAdd,
                    },

                    MOVE_DOWN_TRACK: {
                        cond: ({ state: { tracks } }, { trackID }) => {
                            const trackIndex = tracks.findIndex(
                                ({ id }) => id === trackID,
                            );
                            if (trackIndex === -1) {
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
                        cond: ({ state: { tracks } }, { trackID }) => {
                            const trackIndex = tracks.findIndex(
                                ({ id }) => id === trackID,
                            );
                            if (trackIndex === -1) {
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

                    DELETE_TRACK: {
                        cond: ({ state: { tracks } }, { trackID }) => {
                            const doesTrackExist = tracks.some(
                                ({ id }) => id === trackID,
                            );

                            return doesTrackExist;
                        },

                        target: 'deletingTrack',

                        actions: assignTrackToDelete,
                    },
                },
            },

            addingTrack: {
                tags: 'freezeUi',

                initial: 'sendingToServer',

                states: {
                    sendingToServer: {
                        entry: sendParent(({ trackIDToAdd }) => {
                            if (trackIDToAdd === undefined) {
                                throw new Error(
                                    'trackIDToAdd must be defined before requesting the server',
                                );
                            }

                            return appMusicPlaylistsModel.events.ADD_TRACK(
                                roomID,
                                trackIDToAdd,
                            );
                        }),

                        on: {
                            SENT_TRACK_TO_ADD_TO_SERVER: {
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

            deletingTrack: {
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

                                actions: assignTrackToRemoveToTracksList,
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
