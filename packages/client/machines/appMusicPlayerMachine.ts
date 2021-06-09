import {
    RoomClientToServerEvents,
    RoomServerToClientEvents,
} from '@musicroom/types';
import { Socket } from 'socket.io-client';
import { assign, createMachine, Sender, StateMachine } from 'xstate';

interface TrackVoteRoom {
    id: string;
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
    socket: Socket<RoomServerToClientEvents, RoomClientToServerEvents>;
}

function joinRoomCallback(sendBack: Sender<AppMusicPlayerMachineEvent>) {
    return (roomID: string, name: string) => {
        console.log(roomID);
        sendBack({
            type: 'JOINED_ROOM',
            room: {
                id: roomID,
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
    createMachine<AppMusicPlayerMachineContext, AppMusicPlayerMachineEvent>({
        invoke: {
            src: (_context, event) => (sendBack) => {
                socket.on('JOIN_ROOM_CALLBACK', ({ roomID }) => {
                    console.log(
                        `J'AI BIEN RECU MON FIX AUJDH MAIS JE VAIS EN PRENDRE UN DEUXIEME CE SOIR`,
                        roomID,
                    );
                    sendBack('JOINED_ROOM');
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
                        target: 'joinRoom',
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
                            joinRoomCallback(sendBack),
                        );
                    },
                },

                on: {
                    JOINED_ROOM: {
                        target: 'connectedToRoom',
                        actions: assign((context, event) => {
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
            },
            joinRoom: {
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
                            return event.room.id === context.waitingRoomID;
                        },
                    },
                },
            },
            connectedToRoom: {
                on: {
                    JOIN_ROOM: 'joinRoom',
                },
            },
        },
    });
