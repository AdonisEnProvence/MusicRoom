import {
    ActorRefFrom,
    ContextFrom,
    createMachine,
    EventFrom,
    sendParent,
    send,
} from 'xstate';
import { createModel } from 'xstate/lib/model';
import {
    MpeChangeTrackOrderOperationToApply,
    MpeWorkflowState,
    PlaylistModelMpeWorkflowState,
} from '@musicroom/types';
import { appMusicPlaylistsModel } from './appMusicPlaylistsModel';

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
            userRelatedInformation: null,
        } as PlaylistModelMpeWorkflowState,

        //Can be set to false via get_context response and set to true via join_mpe response
        userIsNotInRoom: undefined as boolean | undefined,
        trackIDToAdd: undefined as string | undefined,
        trackIDToDelete: undefined as string | undefined,

        trackToMove: undefined as TrackToMove | undefined,
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

            MPE_ROOM_VIEW_FOCUS: () => ({}),
            MPE_ROOM_VIEW_BLUR: () => ({}),

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
            SENT_TRACK_TO_DELETE_TO_SERVER: () => ({}),
            RECEIVED_TRACK_TO_DELETE_SUCCESS_CALLBACK: (args: {
                state: MpeWorkflowState;
            }) => args,

            ASSIGN_MERGE_NEW_STATE: (args: {
                state: PlaylistModelMpeWorkflowState;
                userIsNotInRoom?: boolean;
            }) => args,

            GET_CONTEXT: () => ({}),

            JOIN_ROOM: () => ({}),

            LEAVE_ROOM: () => ({}),

            EXPORT_TO_MTV: () => ({}),
            CREATOR_INVITE_USER: (args: { userID: string }) => args,
        },
    },
);

const assignTrackIDToAdd = playlistModel.assign(
    {
        trackIDToAdd: (_, { trackID }) => trackID,
    },
    'ADD_TRACK',
);

const assignTrackToMoveAfterChangeTrackOrderSuccess = playlistModel.assign(
    {
        trackToMove: (_) => undefined,
    },
    'RECEIVED_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
);

const assignTrackIDToDelete = playlistModel.assign(
    {
        trackIDToDelete: (_, { trackID }) => trackID,
    },
    'DELETE_TRACK',
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

const assignMergeNewState = playlistModel.assign(
    {
        state: (context, event) => {
            const { state } = event;

            let userRelatedInformationUpdate =
                context.state.userRelatedInformation;
            if (state.userRelatedInformation !== null) {
                userRelatedInformationUpdate = state.userRelatedInformation;
            }

            return {
                ...context.state,
                ...state,
                userRelatedInformation: userRelatedInformationUpdate,
            };
        },
        userIsNotInRoom: (context, event) => {
            const { userIsNotInRoom } = event;

            return userIsNotInRoom ?? context.userIsNotInRoom;
        },
    },
    'ASSIGN_MERGE_NEW_STATE',
);

type PlaylistMachine = ReturnType<typeof playlistModel['createMachine']>;
export type PlaylistMachineContext = ContextFrom<typeof playlistModel>;
export type PlaylistMachineEvents = EventFrom<typeof playlistModel>;

export type PlaylistActorRef = ActorRefFrom<PlaylistMachine>;

interface CreatePlaylistMachineArgs {
    initialState: PlaylistModelMpeWorkflowState | undefined;
    roomID: string;
}

export function createPlaylistMachine({
    initialState,
    roomID,
}: CreatePlaylistMachineArgs): PlaylistMachine {
    return createMachine({
        initial: 'init',

        context: {
            ...playlistModel.initialContext,
            state: initialState || playlistModel.initialContext.state,
        },

        states: {
            init: {
                tags: 'roomIsNotReady',

                always: [
                    {
                        cond: () => {
                            const playlistHasBeenSpawnedWithoutInitialContext =
                                initialState === undefined;
                            return playlistHasBeenSpawnedWithoutInitialContext;
                        },
                        target: 'retrievingContext',
                    },
                    {
                        target: 'idle',
                    },
                ],
            },

            retrievingContext: {
                tags: 'roomIsNotReady',

                entry: sendParent(() => {
                    return appMusicPlaylistsModel.events.MPE_GET_CONTEXT({
                        roomID,
                    });
                }),

                on: {
                    ASSIGN_MERGE_NEW_STATE: {
                        actions: assignMergeNewState,
                        target: 'idle',
                    },
                },
            },

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

                        actions: assignTrackIDToDelete,
                    },

                    JOIN_ROOM: {
                        cond: ({ userIsNotInRoom }) => userIsNotInRoom === true,

                        target: 'joiningRoom',
                    },

                    LEAVE_ROOM: {
                        cond: ({ userIsNotInRoom }) => userIsNotInRoom !== true,

                        target: `leavingRoom`,
                    },

                    EXPORT_TO_MTV: {
                        actions: sendParent(() => {
                            return appMusicPlaylistsModel.events.EXPORT_TO_MTV_ROOM(
                                {
                                    roomID,
                                },
                            );
                        }),
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
                                    send((_, { state }) =>
                                        playlistModel.events.ASSIGN_MERGE_NEW_STATE(
                                            {
                                                state,
                                            },
                                        ),
                                    ),
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
                                    send((_, { state }) =>
                                        playlistModel.events.ASSIGN_MERGE_NEW_STATE(
                                            {
                                                state,
                                            },
                                        ),
                                    ),
                                    assignTrackToMoveAfterChangeTrackOrderSuccess,
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
                        entry: sendParent(({ trackIDToDelete }) => {
                            if (trackIDToDelete === undefined) {
                                throw new Error(
                                    'trackIDToDelete must be defined before requesting the server',
                                );
                            }

                            return appMusicPlaylistsModel.events.DELETE_TRACK({
                                roomID,
                                trackID: trackIDToDelete,
                            });
                        }),

                        on: {
                            SENT_TRACK_TO_DELETE_TO_SERVER: {
                                target: 'waitingForServerAcknowledgement',
                            },
                        },
                    },

                    waitingForServerAcknowledgement: {
                        on: {
                            RECEIVED_TRACK_TO_DELETE_SUCCESS_CALLBACK: {
                                target: 'debouncing',

                                actions: [
                                    send((_, { state }) =>
                                        playlistModel.events.ASSIGN_MERGE_NEW_STATE(
                                            {
                                                state,
                                            },
                                        ),
                                    ),
                                    'triggerSuccessfulDeletingTrackToast',
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

            joiningRoom: {
                tags: 'freezeUi',

                initial: 'sendingToServer',

                states: {
                    sendingToServer: {
                        always: {
                            actions: sendParent(() => {
                                return appMusicPlaylistsModel.events.JOIN_ROOM({
                                    roomID,
                                });
                            }),
                            target: 'waitingForServerAcknowledgement',
                        },
                    },

                    waitingForServerAcknowledgement: {
                        on: {
                            ASSIGN_MERGE_NEW_STATE: {
                                target: 'debouncing',

                                actions: assignMergeNewState,
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

            leavingRoom: {
                tags: 'freezeUi',

                initial: 'sendingToServer',

                states: {
                    sendingToServer: {
                        always: {
                            actions: sendParent(() => {
                                return appMusicPlaylistsModel.events.LEAVE_ROOM(
                                    {
                                        roomID,
                                    },
                                );
                            }),
                            target: 'waitingForServerAcknowledgement',
                        },
                    },

                    //From there the parent will kill the actor
                    waitingForServerAcknowledgement: {},
                },

                onDone: {
                    target: 'idle',
                },
            },
        },

        //global listeners
        on: {
            ASSIGN_MERGE_NEW_STATE: {
                actions: assignMergeNewState,
            },

            CREATOR_INVITE_USER: {
                actions: sendParent((_context, { userID }) => {
                    return appMusicPlaylistsModel.events.CREATOR_INVITE_USER_IN_ROOM(
                        {
                            roomID,
                            userID,
                        },
                    );
                }),
            },

            MPE_ROOM_VIEW_FOCUS: {
                actions: sendParent(() =>
                    appMusicPlaylistsModel.events.SET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW(
                        {
                            roomID,
                        },
                    ),
                ),
            },

            MPE_ROOM_VIEW_BLUR: {
                actions: sendParent(() =>
                    appMusicPlaylistsModel.events.RESET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW(),
                ),
            },
        },
    });
}
