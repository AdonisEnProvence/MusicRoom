import {
    AppMusicPlayerMachineContext,
    TrackVoteRoom,
    RoomClientToServerCreate,
    TracksMetadata,
} from '@musicroom/types';
import {
    assign,
    createMachine,
    send,
    Sender,
    State,
    StateMachine,
} from 'xstate';
import { SocketClient } from '../hooks/useSocket';

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
    | { type: 'JOINED_ROOM'; room: TrackVoteRoom; tracksList: TracksMetadata[] }
    | { type: 'JOIN_ROOM'; roomID: string }
    | { type: 'MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET' }
    | { type: 'TRACK_HAS_LOADED' }
    | {
          type: 'LOADED_TRACK_DURATION';
          duration: number;
      }
    | {
          type: 'UPDATE_CURRENT_TRACK_ELAPSED_TIME';
          elapsedTime: number;
      }
    | {
          type: 'PLAY_PAUSE_TOGGLE';
          params: { status: 'play' | 'pause'; roomID?: string };
      }
    | { type: 'PLAY_CALLBACK' }
    | { type: 'FORCED_DISCONNECTION' }
    | {
          type: 'RETRIEVE_CONTEXT';
          context: AppMusicPlayerMachineContext;
      }
    | { type: 'PAUSE_CALLBACK' };

interface CreateAppMusicPlayerMachineArgs {
    socket: SocketClient;
}

const rawContext: AppMusicPlayerMachineContext = {
    currentRoom: undefined,
    currentTrack: undefined,
    waitingRoomID: undefined,
    users: undefined,
    tracksList: undefined,

    currentTrackDuration: 42,
    currentTrackElapsedTime: 0,
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
                    socket.on('RETRIEVE_CONTEXT', ({ context }) => {
                        console.log('RETRIVE_CONTEXT');
                        sendBack({
                            type: 'RETRIEVE_CONTEXT',
                            context,
                        });
                    });

                    socket.on(
                        'CREATE_ROOM_CALLBACK',
                        ({ roomID, roomName, tracks }) => {
                            sendBack({
                                type: 'JOINED_ROOM',
                                room: {
                                    name: roomName,
                                    roomID,
                                },
                                tracksList: tracks,
                            });
                        },
                    );

                    socket.on(
                        'JOIN_ROOM_CALLBACK',
                        ({ roomID, roomName, tracks }) => {
                            sendBack({
                                type: 'JOINED_ROOM',
                                room: {
                                    name: roomName,
                                    roomID,
                                },
                                tracksList: tracks,
                            });
                        },
                    );

                    socket.on('ACTION_PLAY_CALLBACK', () => {
                        sendBack({
                            type: 'PLAY_CALLBACK',
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
                        if (e.type === 'PLAY_PAUSE_TOGGLE' && e.params.roomID) {
                            const { roomID, status } = e.params;

                            if (status === 'play') {
                                socket.emit('ACTION_PAUSE');
                            } else {
                                socket.emit('ACTION_PLAY');
                            }
                        }
                    });
                },
            },

            context: rawContext,

            initial: 'waitingJoiningRoom',

            states: {
                waitingJoiningRoom: {
                    entry: 'assignRawContext',
                    on: {
                        CREATE_ROOM: {
                            target: 'connectingToRoom',
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

                connectingToRoom: {
                    invoke: {
                        src: (_context, event) => () => {
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

                    on: {
                        JOINED_ROOM: {
                            target: 'connectedToRoom',
                            actions: 'assignRoomInformationToContext',
                        },
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
                                    event.room.roomID === context.waitingRoomID
                                );
                            },
                            actions: 'assignRoomInformationToContext',
                        },
                    },
                },

                connectedToRoom: {
                    initial: 'waitingForPlayerToBeSet',

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
                            invoke: {
                                src: 'getTrackDuration',
                            },

                            on: {
                                LOADED_TRACK_DURATION: {
                                    target: 'activatedPlayer',
                                    actions: 'assignDurationToContext',
                                },
                            },
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
                                                        roomID: context
                                                            .currentRoom
                                                            ?.roomID,
                                                    },
                                                }),
                                                { to: 'socketConnection' },
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
                                                (context, _event) => ({
                                                    type: 'PLAY_PAUSE_TOGGLE',
                                                    params: {
                                                        status: 'play',
                                                        roomID: context
                                                            .currentRoom
                                                            ?.roomID,
                                                    },
                                                }),
                                                { to: 'socketConnection' },
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
                                PLAY_CALLBACK: {
                                    target: 'activatedPlayer.play',
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
                    actions: 'assignRetrievedContext',
                },
            },
        },
        {
            actions: {
                assignRetrievedContext: assign((context, event) => {
                    if (event.type !== 'RETRIEVE_CONTEXT') {
                        return context;
                    }
                    return {
                        ...context,
                        ...event.context,
                    };
                }),

                assignRawContext: assign((context) => ({
                    ...context,
                    ...rawContext,
                })),

                assignRoomInformationToContext: assign((context, event) => {
                    if (event.type !== 'JOINED_ROOM') {
                        return context;
                    }

                    const { room, tracksList } = event;

                    return {
                        ...context,
                        currentRoom: room,
                        currentTrack: tracksList[0],
                        tracksList: tracksList,
                    };
                }),

                assignElapsedTimeToContext: assign((context, event) => {
                    if (event.type !== 'UPDATE_CURRENT_TRACK_ELAPSED_TIME') {
                        return context;
                    }

                    return {
                        ...context,
                        currentTrackElapsedTime: event.elapsedTime,
                    };
                }),

                assignDurationToContext: assign((context, event) => {
                    if (event.type !== 'LOADED_TRACK_DURATION') {
                        return context;
                    }

                    return {
                        ...context,
                        currentTrackDuration: event.duration,
                    };
                }),
            },
        },
    );
