import { ActorRefFrom } from 'xstate';
import { log } from 'xstate/lib/actions';
import { createModel } from 'xstate/lib/model';
import { SocketClient } from '../contexts/SocketContext';

const appMusicPlaylistsModel = createModel(
    {},
    {
        events: {
            CREATE_ROOM: () => ({}),
        },
        actions: {},
    },
);

type AppMusicPlaylistsMachine = ReturnType<
    typeof appMusicPlaylistsModel['createMachine']
>;

export type AppMusicPlaylistsActorRef = ActorRefFrom<AppMusicPlaylistsMachine>;

interface CreateAppMusicPlaylistsMachineArgs {
    socket: SocketClient;
}

export function createAppMusicPlaylistsMachine({
    socket,
}: CreateAppMusicPlaylistsMachineArgs): AppMusicPlaylistsMachine {
    return appMusicPlaylistsModel.createMachine({
        id: 'appMusicPlaylists',

        initial: 'idle',

        states: {
            idle: {
                on: {
                    CREATE_ROOM: {
                        target: 'creatingRoom',
                    },
                },
            },

            creatingRoom: {
                entry: log('Create a MPE room'),
            },
        },
    });
}
