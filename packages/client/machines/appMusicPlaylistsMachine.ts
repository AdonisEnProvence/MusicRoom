import {
    ActorRefFrom,
    ContextFrom,
    EventFrom,
    Receiver,
    Sender,
    spawn,
    send,
    forwardTo,
} from 'xstate';
import { createModel } from 'xstate/lib/model';
import {
    MpeWorkflowState,
    MpeRoomClientToServerCreateArgs,
} from '@musicroom/types';
import { SocketClient } from '../contexts/SocketContext';
import { createPlaylistMachine, PlaylistActorRef } from './playlistMachine';

export interface MusicPlaylist {
    id: string;
    roomName: string;
    ref: PlaylistActorRef;
}

type MusicPlaylistsContext = ContextFrom<typeof appMusicPlaylistsModel>;
type MusicPlaylistsEvents = EventFrom<typeof appMusicPlaylistsModel>;

const appMusicPlaylistsModel = createModel(
    {
        playlistsActorsRefs: [] as MusicPlaylist[],
    },
    {
        events: {
            CREATE_ROOM: (params: MpeRoomClientToServerCreateArgs) => ({
                params,
            }),
            SPAWN_NEW_PLAYLIST_ACTOR_FROM_STATE: (state: MpeWorkflowState) => ({
                state,
            }),
            FORWARD_ASSIGN_MERGE_NEW_STATE_TO_INVOLVED_PLAYLIST: (
                state: MpeWorkflowState,
            ) => ({
                state,
            }),
        },
    },
);

const spawnPlaylistActor = appMusicPlaylistsModel.assign(
    {
        playlistsActorsRefs: ({ playlistsActorsRefs }, { state }) => {
            const playlistMachine = createPlaylistMachine(state);
            const playlist: MusicPlaylist = {
                id: state.roomID,
                roomName: state.name,
                ref: spawn(playlistMachine, {
                    name: `playlist-${state.roomID}`,
                }),
            };

            return [...playlistsActorsRefs, playlist];
        },
    },
    'SPAWN_NEW_PLAYLIST_ACTOR_FROM_STATE',
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

        invoke: {
            id: 'socketConnection',
            src:
                () =>
                (
                    sendBack: Sender<MusicPlaylistsEvents>,
                    onReceive: Receiver<MusicPlaylistsEvents>,
                ) => {
                    socket.on('MPE_CREATE_ROOM_SYNCED_CALLBACK', (state) => {
                        sendBack({
                            type: 'SPAWN_NEW_PLAYLIST_ACTOR_FROM_STATE',
                            state,
                        });
                    });

                    socket.on('MPE_CREATE_ROOM_CALLBACK', (state) => {
                        sendBack({
                            type: 'FORWARD_ASSIGN_MERGE_NEW_STATE_TO_INVOLVED_PLAYLIST',
                            state,
                        });
                    });

                    onReceive((event) => {
                        switch (event.type) {
                            case 'CREATE_ROOM': {
                                socket.emit('MPE_CREATE_ROOM', event.params);

                                break;
                            }
                        }
                    });
                },
        },

        initial: 'idle',

        states: {
            idle: {
                on: {
                    CREATE_ROOM: {
                        actions: forwardTo('socketConnection'),
                    },
                },
            },
        },

        on: {
            FORWARD_ASSIGN_MERGE_NEW_STATE_TO_INVOLVED_PLAYLIST: {
                actions: send(
                    (_, { state }) => ({
                        type: 'ASSIGN_MERGE_NEW_STATE',
                        state,
                    }),
                    {
                        to: (_, { state, type }) => {
                            console.log(
                                `About to merge new state from ${type} in MPE=${state.roomID}`,
                            );
                            return `playlist-${state.roomID}`;
                        },
                    },
                ),
            },

            SPAWN_NEW_PLAYLIST_ACTOR_FROM_STATE: {
                actions: spawnPlaylistActor,
            },
        },
    });
}
