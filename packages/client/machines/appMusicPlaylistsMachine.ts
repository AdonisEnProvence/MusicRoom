import { ActorRefFrom, spawn } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { nanoid } from 'nanoid/non-secure';
import { SocketClient } from '../contexts/SocketContext';
import { createPlaylistMachine, PlaylistActorRef } from './playlistMachine';

export interface MusicPlaylist {
    id: string;
    roomName: string;
    ref: PlaylistActorRef;
}

const appMusicPlaylistsModel = createModel(
    {
        playlistsActorsRefs: [] as MusicPlaylist[],
    },
    {
        events: {
            CREATE_ROOM: () => ({}),
        },
        actions: {},
    },
);

const spawnPlaylistActor = appMusicPlaylistsModel.assign(
    {
        playlistsActorsRefs: ({ playlistsActorsRefs }) => {
            const playlistID = nanoid();
            const playlistMachine = createPlaylistMachine({
                roomID: playlistID,
            });
            const playlist: MusicPlaylist = {
                id: playlistID,
                roomName: `MPE ${playlistID}`,
                ref: spawn(playlistMachine),
            };

            return [...playlistsActorsRefs, playlist];
        },
    },
    'CREATE_ROOM',
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
                entry: spawnPlaylistActor,
            },
        },
    });
}
