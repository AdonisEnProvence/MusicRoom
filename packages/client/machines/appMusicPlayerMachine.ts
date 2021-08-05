import { MtvWorkflowState, RoomClientToServerCreate } from '@musicroom/types';
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
    autoplay?: boolean;
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
    | { type: 'PLAY_CALLBACK'; state: MtvWorkflowState }
    | { type: 'FORCED_DISCONNECTION' }
    | {
          type: 'RETRIEVE_CONTEXT';
          state: MtvWorkflowState;
      }
    | { type: 'PAUSE_CALLBACK' };

interface CreateAppMusicPlayerMachineArgs {
    socket: SocketClient;
}

const rawContext: AppMusicPlayerMachineContext = {
    name: '',
    playing: false,
    roomCreatorUserID: '',
    roomID: '',
    tracks: null,
    users: [],
    currentTrack: null,
    tracksIDsList: null,
    waitingRoomID: undefined,
    autoplay: undefined,
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
                        console.log('RETRIEVE_CONTEXT');
                        sendBack({
                            type: 'RETRIEVE_CONTEXT',
                            state,
                        });
                    });

                    socket.on('CREATE_ROOM_SYNCHED_CALLBACK', (state) => {
                        console.log('CREATE_ROOM_SYNCHED_CALLBACK recu', {
                            state,
                        });
                        sendBack({
                            type: 'JOINED_CREATED_ROOM',
                            state,
                        });
                    });

                    socket.on('CREATE_ROOM_CALLBACK', (state) => {
                        console.log('CREATE_ROOM_CALLBACK recu', { state });
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

                    socket.on('FORCED_DISCONNECTION', () => {
                        console.log('RECEIVED FORCED DISCONNECTION');
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
                        }
                    });
                },
            },

            context: rawContext,

            initial: 'waitingJoiningRoom',

            states: {
                waitingJoiningRoom: {
                    invoke: {
                        src: (_context) => () => {
                            /**
                             * Looking for other sessions context
                             * e.g already joined room etc etc
                             */
                            socket.emit('GET_CONTEXT');
                        },
                    },
                    entry: 'assignRawContext',
                    on: {
                        CREATE_ROOM: {
                            target: 'creatingRoom',
                        },

                        JOIN_ROOM: {
                            target: 'joiningRoom',
                            actions: assign((context, event) => {
                                if (event.type !== 'JOIN_ROOM') {
                                    return context;
                                }

                                return {
                                    ...context,
                                    waitingRoomID: event.roomID,
                                };
                            }),
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

                            const { roomName, initialTracksIDs } = event;
                            const payload: RoomClientToServerCreate = {
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

                            socket.emit('JOIN_ROOM', { roomID: event.roomID });
                        },
                    },

                    on: {
                        JOINED_ROOM: {
                            target: 'connectedToRoom',
                            cond: (context, event) => {
                                return (
                                    event.state.roomID === context.waitingRoomID
                                );
                            },
                            actions: 'assignMergeNewState',
                        },
                    },
                },

                connectedToRoom: {
                    initial: 'waitingForPlayerToBeSet',

                    tags: 'roomIsReady',

                    states: {
                        waitingForPlayerToBeSet: {
                            on: {
                                MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET: {
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
                                    target: 'activatedPlayer.play',

                                    cond: ({ autoplay }) => autoplay === true,

                                    actions: [
                                        assign((context) => ({
                                            ...context,
                                            autoplay: false,
                                        })),
                                    ],
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
                                                PLAY_PAUSE_TOGGLE: {
                                                    target: 'waitingServerAcknowledgement',
                                                },
                                            },
                                        },

                                        waitingServerAcknowledgement: {
                                            entry: send(
                                                (context, _event) => ({
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
                                                PLAY_PAUSE_TOGGLE: {
                                                    target: 'waitingServerAcknowledgement',
                                                },
                                            },
                                        },

                                        waitingServerAcknowledgement: {
                                            entry: send(
                                                (_context, _event) => ({
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
                                        UPDATE_CURRENT_TRACK_ELAPSED_TIME: {
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

                                        actions: [
                                            'assignMergeNewState',

                                            assign((context) => ({
                                                ...context,
                                                autoplay: true,
                                            })),
                                        ],
                                    },

                                    {
                                        target: 'activatedPlayer.play',
                                        actions: 'assignMergeNewState',
                                    },
                                ],

                                GO_TO_NEXT_TRACK: {
                                    actions: forwardTo('socketConnection'),
                                },
                            },
                        },
                    },

                    on: {
                        FORCED_DISCONNECTION: {
                            target: 'waitingJoiningRoom',
                            actions: 'alertForcedDisconnection',
                        },

                        JOIN_ROOM: { target: 'joiningRoom' },
                    },
                },
            },

            on: {
                RETRIEVE_CONTEXT: {
                    target: 'connectedToRoom',
                    actions: 'assignMergeNewState',
                },
                JOINED_CREATED_ROOM: {
                    target: 'creatingRoom.roomIsNotReady',
                    actions: 'assignMergeNewState',
                },
                ROOM_IS_READY: {
                    target: 'creatingRoom.roomIsReady',
                    actions: 'assignMergeNewState',
                },
            },
        },
        {
            actions: {
                assignMergeNewState: assign((context, event) => {
                    console.log('MERGE ASSIGN FROM event.type = ' + event.type);
                    if (
                        event.type !== 'JOINED_CREATED_ROOM' &&
                        event.type !== 'JOINED_ROOM' &&
                        event.type !== 'RETRIEVE_CONTEXT' &&
                        event.type !== 'ROOM_IS_READY' &&
                        event.type !== 'PLAY_CALLBACK'
                    ) {
                        return context;
                    }

                    return {
                        ...context,
                        ...event.state,
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
                        currentTrack: {
                            ...currentTrack,
                            elapsed: event.elapsedTime,
                        },
                    };
                }),
            },
        },
    );
