import {
    ActorRefFrom,
    ContextFrom,
    createMachine,
    EventFrom,
    sendParent,
} from 'xstate';
import { createModel } from 'xstate/lib/model';
import {
    MpeChangeTrackOrderOperationToApply,
    MpeRoomClientToServerChangeTrackOrderUpDownArgs,
    MpeWorkflowState,
} from '@musicroom/types';
import { appMusicPlaylistsModel } from './appMusicPlaylistsMachine';

interface TrackToMove {
    fromIndex: number;
    trackID: string;
    operationToApply: MpeChangeTrackOrderOperationToApply;
}

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

        trackToMove: undefined as TrackToMove | undefined,
        trackToDelete: undefined as string | undefined,
    },
    {
        events: {
            //Add track
            ADD_TRACK: (trackID: string) => ({ trackID }),
            SENT_TRACK_TO_ADD_TO_SERVER: () => ({}),
            RECEIVED_TRACK_TO_ADD_SUCCESS_CALLBACK: (args: {
                state: MpeWorkflowState;
            }) => args,
            RECEIVED_TRACK_TO_ADD_FAIL_CALLBACK: () => ({}),
            ///

            //Change track order
            CHANGE_TRACK_ORDER_DOWN: (args: { trackID: string }) => args,
            CHANGE_TRACK_ORDER_UP: (args: { trackID: string }) => args,
            SENT_CHANGE_TRACK_ORDER_TO_SERVER: () => ({}),
            RECEIVED_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK: (args: {
                state: MpeWorkflowState;
            }) => args,
            RECEIVED_CHANGE_TRACK_ORDER_FAIL_CALLBACK: () => ({}),
            ///

            DELETE_TRACK: (trackID: string) => ({ trackID }),
            ASSIGN_MERGE_NEW_STATE: (state: MpeWorkflowState) => ({ state }),
        },
    },
);

const assignTrackIDToAdd = playlistModel.assign(
    {
        trackIDToAdd: (_, { trackID }) => trackID,
    },
    'ADD_TRACK',
);

const assignStateAfterAddingTracksSuccess = playlistModel.assign(
    {
        state: (_, { state }) => state,
    },
    'RECEIVED_TRACK_TO_ADD_SUCCESS_CALLBACK',
);

const assignStateAfterChangeTrackOrderSuccess = playlistModel.assign(
    {
        state: (_, { state }) => state,
        trackToMove: (_) => undefined,
    },
    'RECEIVED_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
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
                fromIndex: currentIndex,
                operationToApply: MpeChangeTrackOrderOperationToApply.Values.UP,
            };
        },
    },
    'CHANGE_TRACK_ORDER_UP',
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
                fromIndex: currentIndex,
                operationToApply:
                    MpeChangeTrackOrderOperationToApply.Values.DOWN,
            };
        },
    },
    'CHANGE_TRACK_ORDER_DOWN',
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
export type PlaylistMachineContext = ContextFrom<typeof playlistModel>;
export type PlaylistMachineEvents = EventFrom<typeof playlistModel>;

export type PlaylistActorRef = ActorRefFrom<PlaylistMachine>;

interface CreatePlaylistMachineArgs {
    initialState: MpeWorkflowState;
}

export function createPlaylistMachine({
    initialState,
}: CreatePlaylistMachineArgs): PlaylistMachine {
    const roomID = initialState.roomID;

    return createMachine({
        initial: 'idle',

        context: {
            ...playlistModel.initialContext,
            state: initialState,
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

                    CHANGE_TRACK_ORDER_DOWN: {
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

                    CHANGE_TRACK_ORDER_UP: {
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

                            return appMusicPlaylistsModel.events.ADD_TRACK({
                                roomID,
                                trackID: trackIDToAdd,
                            });
                        }),

                        on: {
                            SENT_TRACK_TO_ADD_TO_SERVER: {
                                target: 'waitingForServerAcknowledgement',
                            },
                        },
                    },

                    waitingForServerAcknowledgement: {
                        on: {
                            RECEIVED_TRACK_TO_ADD_SUCCESS_CALLBACK: {
                                target: 'debouncing',

                                actions: [
                                    assignStateAfterAddingTracksSuccess,
                                    'triggerSuccessfulAddingTrackToast',
                                ],
                            },

                            RECEIVED_TRACK_TO_ADD_FAIL_CALLBACK: {
                                target: 'debouncing',

                                actions: 'triggerFailureAddingTrackToast',
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
                        entry: sendParent(({ trackToMove }) => {
                            if (trackToMove === undefined) {
                                throw new Error(
                                    'trackToMove must be defined before requesting the server',
                                );
                            }
                            const { operationToApply, ...rest } = trackToMove;
                            const operationToApplyIsDown =
                                operationToApply ===
                                MpeChangeTrackOrderOperationToApply.Values.DOWN;

                            if (operationToApplyIsDown) {
                                return appMusicPlaylistsModel.events.CHANGE_TRACK_ORDER_DOWN(
                                    {
                                        ...rest,
                                        roomID,
                                    },
                                );
                            } else {
                                return appMusicPlaylistsModel.events.CHANGE_TRACK_ORDER_UP(
                                    {
                                        ...rest,
                                        roomID,
                                    },
                                );
                            }
                        }),

                        on: {
                            SENT_CHANGE_TRACK_ORDER_TO_SERVER: {
                                target: 'waitingForServerAcknowledgement',
                            },
                        },
                    },

                    waitingForServerAcknowledgement: {
                        on: {
                            RECEIVED_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK: {
                                target: 'debouncing',

                                actions: [
                                    assignStateAfterChangeTrackOrderSuccess,
                                    'triggerSuccessfulChangeTrackOrderToast',
                                ],
                            },

                            RECEIVED_CHANGE_TRACK_ORDER_FAIL_CALLBACK: {
                                target: 'debouncing',

                                actions: [
                                    'triggerFailureChangeTrackOrderToast',
                                ],
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
