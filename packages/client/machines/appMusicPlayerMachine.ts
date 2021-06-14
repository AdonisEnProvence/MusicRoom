import {
    assign,
    createMachine,
    send,
    Sender,
    State,
    StateMachine,
} from 'xstate';
import { SocketClient } from '../hooks/useSocket';

interface TrackVoteRoom {
    roomID: string;
    name: string;
}

interface TrackVoteTrack {
    name: string;
    artistName: string;
}
export interface AppMusicPlayerMachineContext {
    currentRoom?: TrackVoteRoom;
    currentTrack?: TrackVoteTrack;
    waitingRoomID?: string;
}

export type AppMusicPlayerMachineState = State<
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent
>;

export type AppMusicPlayerMachineEvent =
    | {
          type: 'CREATE_ROOM';
          roomName: string;
      }
    | { type: 'JOINED_ROOM'; room: TrackVoteRoom; track: TrackVoteTrack }
    | { type: 'JOIN_ROOM'; roomID: string }
    | {
          type: 'PLAY_PAUSE_TOGGLE';
          params: { status: 'play' | 'pause'; roomID?: string };
      }
    | { type: 'PLAY_CALLBACK' }
    | { type: 'PAUSE_CALLBACK' };

interface CreateAppMusicPlayerMachineArgs {
    socket: SocketClient;
}

function joiningRoomCallback(sendBack: Sender<AppMusicPlayerMachineEvent>) {
    return (roomID: string, name: string) => {
        console.log(roomID);
        sendBack({
            type: 'JOINED_ROOM',
            room: {
                roomID,
                name,
            },
            track: {
                name: 'Monde Nouveau',
                artistName: 'Feu! Chatterton',
            },
        });
    };
}

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
                id: 'root',
                src: (context, _event) => (sendBack, onReceive) => {
                    socket.on('JOIN_ROOM_CALLBACK', ({ roomID, name }) => {
                        sendBack({
                            type: 'JOINED_ROOM',
                            room: {
                                name: name,
                                roomID,
                            },
                            track: {
                                artistName: 'artistName', //TODO
                                name: 'name', //TODO
                            },
                        });
                    });

                    socket.on('ACTION_PLAY_CALLBACK', () => {
                        console.log('SERVER RESPONSE FOR PLAY');
                        sendBack({
                            type: 'PLAY_CALLBACK',
                        });
                    });

                    socket.on('ACTION_PAUSE_CALLBACK', () => {
                        console.log('SERVER RESPONSE FOR PAUSE');
                        sendBack({
                            type: 'PAUSE_CALLBACK',
                        });
                    });

                    onReceive((e) => {
                        console.log('Event received ' + e.type);
                        if (e.type === 'PLAY_PAUSE_TOGGLE' && e.params.roomID) {
                            console.log(e.params);
                            const { roomID, status } = e.params;
                            const payload = {
                                roomID: roomID,
                            };
                            if (status === 'play') {
                                socket.emit('ACTION_PAUSE', payload);
                            } else {
                                socket.emit('ACTION_PLAY', payload);
                            }
                        }
                    });
                },
            },

            context: {
                currentRoom: undefined,
                currentTrack: undefined,
                waitingRoomID: undefined,
            },

            initial: 'waitingJoiningRoom',

            states: {
                waitingJoiningRoom: {
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
                        src: (_context, event) => (sendBack) => {
                            if (event.type !== 'CREATE_ROOM') {
                                throw new Error(
                                    'Service must be called in reaction to CREATE_ROOM event',
                                );
                            }
                            const payload = {
                                userID: 'user1',
                                name: 'your_room_name',
                            };
                            socket.emit(
                                'CREATE_ROOM',
                                payload,
                                joiningRoomCallback(sendBack),
                            );
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
                            console.log('POUIOUIUIPOUIIOPUOIPUOIU', event);
                            const payload = {
                                roomID: event.roomID,
                                userID: 'user2',
                            };
                            socket.emit('JOIN_ROOM', payload);
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
                    initial: 'pause',
                    states: {
                        pause: {
                            initial: 'idle',
                            states: {
                                idle: {
                                    on: {
                                        PLAY_PAUSE_TOGGLE: {
                                            target: 'toggled',
                                        },
                                    },
                                },
                                toggled: {
                                    entry: send(
                                        (context, _event) => ({
                                            type: 'PLAY_PAUSE_TOGGLE',
                                            params: {
                                                status: 'pause',
                                                roomID: context.currentRoom
                                                    ?.roomID,
                                            },
                                        }),
                                        { to: 'root' },
                                    ),
                                },
                            },
                        },
                        play: {
                            initial: 'idle',
                            states: {
                                idle: {
                                    on: {
                                        PLAY_PAUSE_TOGGLE: {
                                            target: 'toggled',
                                        },
                                    },
                                },
                                toggled: {
                                    entry: send(
                                        (context, _event) => ({
                                            type: 'PLAY_PAUSE_TOGGLE',
                                            params: {
                                                status: 'play',
                                                roomID: context.currentRoom
                                                    ?.roomID,
                                            },
                                        }),
                                        { to: 'root' },
                                    ),
                                },
                            },
                        },
                    },
                    on: {
                        PAUSE_CALLBACK: { target: '.pause' },
                        PLAY_CALLBACK: { target: '.play' },
                        JOIN_ROOM: 'joiningRoom',
                    },
                },
            },
        },
        {
            actions: {
                assignRoomInformationToContext: assign((context, event) => {
                    if (event.type !== 'JOINED_ROOM') {
                        return context;
                    }

                    return {
                        ...context,
                        currentRoom: event.room,
                        currentTrack: event.track,
                    };
                }),
            },
        },
    );
