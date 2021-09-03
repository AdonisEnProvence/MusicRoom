import {
    MtvRoomClientToServerCreate,
    MtvWorkflowState,
} from '@musicroom/types';
import {
    assign,
    createMachine,
    forwardTo,
    send,
    State,
    StateMachine,
} from 'xstate';
import { SocketClient } from '../hooks/useSocket';

export interface AppMusicPlayerMachineContext extends MtvWorkflowState {
    waitingRoomID?: string;
    progressElapsedTime: number;

    closeSuggestionModal?: () => void;
}

export type AppMusicPlayerMachineState = State<
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent
>;

export type AppMusicPlayerMachineEvent =
    | {
          type: 'CREATE_ROOM';
          roomName: string;
          initialTracksIDs: string[];
      }
    | { type: 'JOINED_ROOM'; state: MtvWorkflowState }
    | { type: 'JOINED_CREATED_ROOM'; state: MtvWorkflowState }
    | { type: 'ROOM_IS_READY'; state: MtvWorkflowState }
    | { type: 'JOIN_ROOM'; roomID: string }
    | { type: 'MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET' }
    | { type: 'TRACK_HAS_LOADED' }
    | {
          type: 'UPDATE_CURRENT_TRACK_ELAPSED_TIME';
          elapsedTime: number;
      }
    | {
          type: 'PLAY_PAUSE_TOGGLE';
          params: { status: 'play' | 'pause' };
      }
    | { type: 'GO_TO_NEXT_TRACK' }
    | { type: 'CHANGE_EMITTING_DEVICE'; deviceID: string }
    | { type: 'PLAY_CALLBACK'; state: MtvWorkflowState }
    | { type: 'FORCED_DISCONNECTION' }
    | { type: 'LEAVE_ROOM' }
    | { type: 'USER_LENGTH_UPDATE'; state: MtvWorkflowState }
    | { type: 'FOCUS_READY' }
    | { type: 'CHANGE_EMITTING_DEVICE_CALLBACK'; state: MtvWorkflowState }
    | {
          type: 'RETRIEVE_CONTEXT';
          state: MtvWorkflowState;
      }
    | { type: 'PAUSE_CALLBACK' }
    | {
          type: 'SUGGEST_TRACKS';
          tracksToSuggest: string[];
          closeSuggestionModal: () => void;
      }
    | { type: 'SUGGESTED_TRACKS_LIST_UPDATE'; state: MtvWorkflowState }
    | { type: 'SUGGEST_TRACKS_CALLBACK' };

interface CreateAppMusicPlayerMachineArgs {
    socket: SocketClient;
}

const rawContext: AppMusicPlayerMachineContext = {
    name: '',
    playing: false,
    roomCreatorUserID: '',
    roomID: '',
    tracks: null,
    userRelatedInformation: null,
    usersLength: 0,
    currentTrack: null,
    waitingRoomID: undefined,
    progressElapsedTime: 0,
    closeSuggestionModal: undefined,
    minimumScoreToBePlayed: 1,
};

export const createAppMusicPlayerMachine = ({
    socket,
}: CreateAppMusicPlayerMachineArgs): StateMachine<
    AppMusicPlayerMachineContext,
    any,
    AppMusicPlayerMachineEvent
> =>
    createMachine<AppMusicPlayerMachineContext, AppMusicPlayerMachineEvent>(
        {
            invoke: {
                id: 'socketConnection',
                src: (_context, _event) => (sendBack, onReceive) => {
                    socket.on('RETRIEVE_CONTEXT', (state) => {
                        sendBack({
                            type: 'RETRIEVE_CONTEXT',
                            state,
                        });
                    });

                    socket.on('USER_LENGTH_UPDATE', (state) => {
                        console.log('USER_LENGTH_UPDATE');
                        sendBack({
                            type: 'USER_LENGTH_UPDATE',
                            state,
                        });
                    });

                    socket.on('CREATE_ROOM_SYNCHED_CALLBACK', (state) => {
                        sendBack({
                            type: 'JOINED_CREATED_ROOM',
                            state,
                        });
                    });

                    socket.on('CHANGE_EMITTING_DEVICE_CALLBACK', (state) => {
                        sendBack({
                            type: 'CHANGE_EMITTING_DEVICE_CALLBACK',
                            state,
                        });
                    });

                    socket.on('CREATE_ROOM_CALLBACK', (state) => {
                        sendBack({
                            type: 'ROOM_IS_READY',
                            state,
                        });
                    });

                    socket.on('JOIN_ROOM_CALLBACK', (state) => {
                        sendBack({
                            type: 'JOINED_ROOM',
                            state,
                        });
                    });

                    socket.on('ACTION_PLAY_CALLBACK', (state) => {
                        sendBack({
                            type: 'PLAY_CALLBACK',
                            state,
                        });
                    });

                    socket.on('ACTION_PAUSE_CALLBACK', () => {
                        sendBack({
                            type: 'PAUSE_CALLBACK',
                        });
                    });

                    socket.on('SUGGESTED_TRACKS_LIST_UPDATE', (state) => {
                        sendBack({
                            type: 'SUGGESTED_TRACKS_LIST_UPDATE',
                            state,
                        });
                    });

                    socket.on('SUGGEST_TRACKS_CALLBACK', () => {
                        sendBack({
                            type: 'SUGGEST_TRACKS_CALLBACK',
                        });
                    });

                    socket.on('FORCED_DISCONNECTION', () => {
                        sendBack({
                            type: 'FORCED_DISCONNECTION',
                        });
                    });

                    onReceive((e) => {
                        switch (e.type) {
                            case 'PLAY_PAUSE_TOGGLE': {
                                const { status } = e.params;

                                if (status === 'play') {
                                    socket.emit('ACTION_PAUSE');
                                } else {
                                    socket.emit('ACTION_PLAY');
                                }

                                break;
                            }

                            case 'GO_TO_NEXT_TRACK': {
                                socket.emit('GO_TO_NEXT_TRACK');

                                break;
                            }

                            case 'LEAVE_ROOM': {
                                socket.emit('LEAVE_ROOM');

                                break;
                            }

                            case 'CHANGE_EMITTING_DEVICE': {
                                console.log(
                                    'CHANGE EMITTING DEVICE ABOUT TO BE EMIT WITH PARAMS ',
                                    e.params,
                                );

                                socket.emit('CHANGE_EMITTING_DEVICE', {
                                    newEmittingDeviceID: e.params.deviceID,
                                });

                                break;
                            }

                            case 'SUGGEST_TRACKS': {
                                const tracksToSuggest = e.tracksToSuggest;

                                socket.emit('SUGGEST_TRACKS', {
                                    tracksToSuggest,
                                });

                                break;
                            }
                        }
                    });
                },
            },

            context: rawContext,

            initial: 'waitingForFocusPage',

            states: {
                /**
                 * As the youtube player won't autoplay is the page is not focus on the web
                 * we need to wait for the user's focus before asking for stored context
                 */
                waitingForFocusPage: {
                    invoke: {
                        src: 'listenForFocus',
                    },

                    on: {
                        FOCUS_READY: {
                            target: 'pageHasBeenFocused',
                        },
                    },
                },

                pageHasBeenFocused: {
                    initial: 'waitingForJoinOrCreateRoom',

                    states: {
                        waitingForJoinOrCreateRoom: {
                            entry: 'assignRawContext',
                            invoke: {
                                src: (_context) => () => {
                                    /**
                                     * Looking for other sessions context
                                     * e.g already joined room etc etc
                                     */
                                    socket.emit('GET_CONTEXT');
                                },
                            },
                        },

                        creatingRoom: {
                            invoke: {
                                src: (_context, event) => (sendBack) => {
                                    //Handle global external transitions
                                    if (
                                        event.type === 'JOINED_CREATED_ROOM' ||
                                        event.type === 'ROOM_IS_READY'
                                    )
                                        return;

                                    if (event.type !== 'CREATE_ROOM') {
                                        throw new Error(
                                            'Service must be called in reaction to CREATE_ROOM event',
                                        );
                                    }

                                    const { roomName, initialTracksIDs } =
                                        event;
                                    const payload: MtvRoomClientToServerCreate =
                                        {
                                            name: roomName,
                                            initialTracksIDs,
                                        };

                                    socket.emit('CREATE_ROOM', payload);
                                },
                            },

                            initial: 'connectingToRoom',
                            states: {
                                connectingToRoom: {
                                    on: {
                                        JOINED_CREATED_ROOM: {
                                            target: 'roomIsNotReady',
                                            actions: 'assignMergeNewState',
                                        },
                                    },
                                },

                                roomIsNotReady: {
                                    on: {
                                        ROOM_IS_READY: {
                                            target: 'roomIsReady',
                                            actions: 'assignMergeNewState',
                                        },
                                    },
                                },

                                roomIsReady: {
                                    type: 'final',
                                },
                            },

                            onDone: {
                                target: 'connectedToRoom',
                            },
                        },

                        joiningRoom: {
                            invoke: {
                                src: (_context, event) => (sendBack) => {
                                    if (event.type !== 'JOIN_ROOM') {
                                        throw new Error(
                                            'Service must be called in reaction to JOIN_ROOM event',
                                        );
                                    }

                                    socket.emit('JOIN_ROOM', {
                                        roomID: event.roomID,
                                    });
                                },
                            },

                            on: {
                                JOINED_ROOM: {
                                    target: 'connectedToRoom',
                                    cond: (context, event) => {
                                        return (
                                            event.state.roomID ===
                                            context.waitingRoomID
                                        );
                                    },
                                    actions: 'assignMergeNewState',
                                },
                            },
                        },

                        connectedToRoom: {
                            type: 'parallel',

                            tags: 'roomIsReady',

                            states: {
                                playerState: {
                                    initial: 'waitingForPlayerToBeSet',

                                    states: {
                                        waitingForPlayerToBeSet: {
                                            on: {
                                                MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET:
                                                    {
                                                        target: 'waitingForTrackToLoad',
                                                    },
                                            },
                                        },

                                        waitingForTrackToLoad: {
                                            on: {
                                                TRACK_HAS_LOADED: {
                                                    target: 'loadingTrackDuration',
                                                },
                                            },
                                        },

                                        loadingTrackDuration: {
                                            always: [
                                                {
                                                    cond: ({ playing }) =>
                                                        playing === true,
                                                    target: 'activatedPlayer.play',
                                                },

                                                {
                                                    target: 'activatedPlayer.pause',
                                                },
                                            ],
                                        },

                                        activatedPlayer: {
                                            initial: 'pause',

                                            states: {
                                                pause: {
                                                    tags: 'playerOnPause',

                                                    initial: 'idle',

                                                    states: {
                                                        idle: {
                                                            on: {
                                                                PLAY_PAUSE_TOGGLE:
                                                                    {
                                                                        target: 'waitingServerAcknowledgement',
                                                                    },
                                                            },
                                                        },

                                                        waitingServerAcknowledgement:
                                                            {
                                                                entry: send(
                                                                    (
                                                                        context,
                                                                        _event,
                                                                    ) => ({
                                                                        type: 'PLAY_PAUSE_TOGGLE',
                                                                        params: {
                                                                            status: 'pause',
                                                                        },
                                                                    }),
                                                                    {
                                                                        to: 'socketConnection',
                                                                    },
                                                                ),
                                                            },
                                                    },
                                                },

                                                play: {
                                                    tags: 'playerOnPlay',

                                                    invoke: {
                                                        src: 'pollTrackElapsedTime',
                                                    },

                                                    initial: 'idle',

                                                    states: {
                                                        idle: {
                                                            on: {
                                                                PLAY_PAUSE_TOGGLE:
                                                                    {
                                                                        target: 'waitingServerAcknowledgement',
                                                                    },
                                                            },
                                                        },

                                                        waitingServerAcknowledgement:
                                                            {
                                                                entry: send(
                                                                    (
                                                                        _context,
                                                                        _event,
                                                                    ) => ({
                                                                        type: 'PLAY_PAUSE_TOGGLE',
                                                                        params: {
                                                                            status: 'play',
                                                                        },
                                                                    }),
                                                                    {
                                                                        to: 'socketConnection',
                                                                    },
                                                                ),
                                                            },
                                                    },

                                                    on: {
                                                        UPDATE_CURRENT_TRACK_ELAPSED_TIME:
                                                            {
                                                                actions:
                                                                    'assignElapsedTimeToContext',
                                                            },
                                                    },
                                                },
                                            },

                                            on: {
                                                PAUSE_CALLBACK: {
                                                    target: 'activatedPlayer.pause',
                                                },

                                                PLAY_CALLBACK: [
                                                    {
                                                        target: 'waitingForTrackToLoad',

                                                        cond: (
                                                            { currentTrack },
                                                            {
                                                                state: {
                                                                    currentTrack:
                                                                        currentTrackToBeSet,
                                                                },
                                                            },
                                                        ) => {
                                                            const isDifferentCurrentTrack =
                                                                currentTrack?.id !==
                                                                currentTrackToBeSet?.id;

                                                            return isDifferentCurrentTrack;
                                                        },

                                                        actions:
                                                            'assignMergeNewState',
                                                    },

                                                    {
                                                        target: 'activatedPlayer.play',
                                                        actions:
                                                            'assignMergeNewState',
                                                    },
                                                ],

                                                GO_TO_NEXT_TRACK: {
                                                    actions:
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                },
                                            },
                                        },
                                    },
                                },

                                tracksSuggestion: {
                                    initial: 'waitingForTracksToBeSuggested',

                                    states: {
                                        waitingForTracksToBeSuggested: {
                                            on: {
                                                SUGGEST_TRACKS: {
                                                    target: 'waitingForTracksSuggestionToBeAcknowledged',

                                                    actions: [
                                                        assign({
                                                            closeSuggestionModal:
                                                                (
                                                                    _context,
                                                                    {
                                                                        closeSuggestionModal,
                                                                    },
                                                                ) =>
                                                                    closeSuggestionModal,
                                                        }),

                                                        send(
                                                            (
                                                                _context,
                                                                event,
                                                            ) => ({
                                                                type: 'SUGGEST_TRACKS',
                                                                tracksToSuggest:
                                                                    event.tracksToSuggest,
                                                            }),
                                                            {
                                                                to: 'socketConnection',
                                                            },
                                                        ),
                                                    ],
                                                },
                                            },
                                        },

                                        waitingForTracksSuggestionToBeAcknowledged:
                                            {
                                                tags: [
                                                    'showActivityIndicatorOnSuggestionsResultsScreen',
                                                ],

                                                on: {
                                                    SUGGEST_TRACKS_CALLBACK: {
                                                        target: 'waitingForTracksToBeSuggested',

                                                        actions: [
                                                            ({
                                                                closeSuggestionModal,
                                                            }) => {
                                                                closeSuggestionModal?.();
                                                            },

                                                            'showTracksSuggestionAcknowledgementToast',
                                                        ],
                                                    },
                                                },
                                            },
                                    },

                                    on: {
                                        SUGGESTED_TRACKS_LIST_UPDATE: {
                                            actions: 'assignMergeNewState',
                                        },
                                    },
                                },
                            },

                            on: {
                                FORCED_DISCONNECTION: {
                                    target: 'waitingForJoinOrCreateRoom',
                                    actions: [
                                        'assignRawContext',
                                        'displayAlertForcedDisconnection',
                                    ],
                                },

                                LEAVE_ROOM: {
                                    target: 'waitingForJoinOrCreateRoom',
                                    actions: [
                                        'assignRawContext',
                                        send(
                                            (_context) => ({
                                                type: 'LEAVE_ROOM',
                                            }),
                                            {
                                                to: 'socketConnection',
                                            },
                                        ),
                                        'leaveRoomFromLeaveRoomButton',
                                    ],
                                },

                                CHANGE_EMITTING_DEVICE: {
                                    cond: (
                                        { userRelatedInformation },
                                        { deviceID },
                                    ) => {
                                        if (userRelatedInformation !== null) {
                                            const pickedDeviceIsNotEmitting =
                                                userRelatedInformation.emittingDeviceID !==
                                                deviceID;

                                            return pickedDeviceIsNotEmitting;
                                        }
                                        return false;
                                    },
                                    actions: send(
                                        (_context, event) => ({
                                            type: 'CHANGE_EMITTING_DEVICE',
                                            params: {
                                                deviceID: event.deviceID,
                                            },
                                        }),
                                        {
                                            to: 'socketConnection',
                                        },
                                    ),
                                },

                                USER_LENGTH_UPDATE: {
                                    actions: 'assignMergeNewState',
                                },

                                CHANGE_EMITTING_DEVICE_CALLBACK: {
                                    cond: ({ userRelatedInformation }) => {
                                        const userRelatedInformationIsNotNull =
                                            userRelatedInformation !== null;

                                        if (
                                            userRelatedInformationIsNotNull ===
                                            false
                                        ) {
                                            console.error(
                                                'UserRelatedInformation should not be null',
                                            );
                                        }

                                        return userRelatedInformationIsNotNull;
                                    },
                                    actions: `assignMergeNewState`,
                                },
                            },
                        },
                    },

                    on: {
                        JOIN_ROOM: {
                            target: '.joiningRoom',
                            actions: assign((context, event) => {
                                if (event.type !== 'JOIN_ROOM') {
                                    return context;
                                }

                                return {
                                    ...rawContext,
                                    waitingRoomID: event.roomID,
                                };
                            }),
                        },

                        CREATE_ROOM: {
                            target: '.creatingRoom',
                            actions: 'assignRawContext',
                        },

                        RETRIEVE_CONTEXT: {
                            target: '.connectedToRoom',
                            actions: 'assignMergeNewState',
                        },
                        JOINED_CREATED_ROOM: {
                            target: '.creatingRoom.roomIsNotReady',
                            actions: 'assignMergeNewState',
                        },
                        ROOM_IS_READY: {
                            target: '.creatingRoom.roomIsReady',
                            actions: 'assignMergeNewState',
                        },
                    },
                },
            },
        },
        {
            actions: {
                assignMergeNewState: assign((context, event) => {
                    if (
                        event.type !== 'JOINED_CREATED_ROOM' &&
                        event.type !== 'JOINED_ROOM' &&
                        event.type !== 'RETRIEVE_CONTEXT' &&
                        event.type !== 'ROOM_IS_READY' &&
                        event.type !== 'PLAY_CALLBACK' &&
                        event.type !== 'CHANGE_EMITTING_DEVICE_CALLBACK' &&
                        event.type !== 'USER_LENGTH_UPDATE' &&
                        event.type !== 'SUGGESTED_TRACKS_LIST_UPDATE'
                    ) {
                        return context;
                    }
                    console.log(
                        'MERGE ASSIGN FROM event.type = ' + event.type,
                        event.state,
                    );
                    let userRelatedInformationUpdate =
                        context.userRelatedInformation;
                    if (event.state.userRelatedInformation !== null) {
                        userRelatedInformationUpdate =
                            event.state.userRelatedInformation;
                    }

                    return {
                        ...context,
                        ...event.state,
                        progressElapsedTime: event.state.currentTrack?.elapsed,
                        userRelatedInformation: userRelatedInformationUpdate,
                    };
                }),

                assignRawContext: assign((context) => ({
                    ...context,
                    ...rawContext,
                })),

                assignElapsedTimeToContext: assign((context, event) => {
                    if (event.type !== 'UPDATE_CURRENT_TRACK_ELAPSED_TIME') {
                        return context;
                    }

                    const currentTrack = context.currentTrack;
                    if (!currentTrack)
                        throw new Error('currentTrack is undefined');

                    return {
                        ...context,
                        progressElapsedTime: event.elapsedTime,
                    };
                }),
            },
        },
    );
