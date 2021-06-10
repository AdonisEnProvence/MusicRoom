import { assign, createMachine, Sender, StateMachine } from 'xstate';
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

export type AppMusicPlayerMachineEvent =
    | {
          type: 'CREATE_ROOM';
          roomName: string;
      }
    | { type: 'JOINED_ROOM'; room: TrackVoteRoom; track: TrackVoteTrack }
    | { type: 'JOIN_ROOM'; roomID: string };

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
                src: (_context, _event) => (sendBack) => {
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
                    on: {
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
