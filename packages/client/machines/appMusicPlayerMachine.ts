import { assign, createMachine } from 'xstate';

interface TrackVoteRoom {
    id: string;
    name: string;
}

export interface AppMusicPlayerMachineContext {
    currentRoom?: TrackVoteRoom;
    currentTrack?: {
        name: string;
        artistName: string;
    };
}

export type AppMusicPlayerMachineEvent =
    | {
          type: 'CREATE_ROOM';
          roomName: string;
      }
    | { type: 'JOINED_ROOM'; room: TrackVoteRoom };

export const appMusicPlayerMachine = createMachine<
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent
>({
    context: {
        currentRoom: undefined,
        currentTrack: undefined,
    },

    initial: 'waitingJoiningRoom',

    states: {
        waitingJoiningRoom: {
            on: {
                CREATE_ROOM: {},
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

                    console.log('roomName', event.roomName);

                    sendBack({
                        type: 'JOINED_ROOM',
                        room: {
                            id: event.roomName,
                            name: event.roomName,
                        },
                    });
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
                        };
                    }),
                },
            },
        },

        connectedToRoom: {},
    },
});
