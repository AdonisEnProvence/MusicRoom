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
import Toast from 'react-native-toast-message';
import { SocketClient } from '../contexts/SocketContext';
import {
    createPlaylistMachine,
    PlaylistActorRef,
    playlistModel,
} from './playlistMachine';

export interface MusicPlaylist {
    id: string;
    roomName: string;
    ref: PlaylistActorRef;
}

type MusicPlaylistsContext = ContextFrom<typeof appMusicPlaylistsModel>;
type MusicPlaylistsEvents = EventFrom<typeof appMusicPlaylistsModel>;

export const appMusicPlaylistsModel = createModel(
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

            ADD_TRACK: (roomID: string, trackID: string) => ({
                roomID,
                trackID,
            }),
            SENT_TRACK_TO_ADD_TO_SERVER: (roomID: string) => ({ roomID }),
            RECEIVED_ADD_TRACKS_SUCCESS_CALLBACK: (args: {
                roomID: string;
                state: MpeWorkflowState;
            }) => args,
            RECEIVED_ADD_TRACKS_FAIL_CALLBACK: (args: { roomID: string }) =>
                args,
        },
    },
);

const spawnPlaylistActor = appMusicPlaylistsModel.assign(
    {
        playlistsActorsRefs: ({ playlistsActorsRefs }, { state }) => {
            const playlistMachine = createPlaylistMachine({
                initialState: state,
                triggerSuccessfulAddingTrackToast: () => {
                    Toast.show({
                        type: 'success',
                        text1: 'Track added successfully',
                    });
                },
                triggerFailureAddingTrackToast: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Track could not be added',
                    });
                },
            });
            const playlist: MusicPlaylist = {
                id: state.roomID,
                roomName: state.name,
                ref: spawn(playlistMachine, {
                    name: getPlaylistMachineActorName(state.roomID),
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

function getPlaylistMachineActorName(roomID: string): string {
    return `playlist-${roomID}`;
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

                    socket.on(
                        'MPE_ADD_TRACKS_SUCCESS_CALLBACK',
                        ({ roomID, state }) => {
                            sendBack({
                                type: 'RECEIVED_ADD_TRACKS_SUCCESS_CALLBACK',
                                roomID,
                                state,
                            });
                        },
                    );

                    socket.on('MPE_ADD_TRACKS_FAIL_CALLBACK', ({ roomID }) => {
                        sendBack({
                            type: 'RECEIVED_ADD_TRACKS_FAIL_CALLBACK',
                            roomID,
                        });
                    });

                    onReceive((event) => {
                        switch (event.type) {
                            case 'CREATE_ROOM': {
                                socket.emit('MPE_CREATE_ROOM', event.params);

                                break;
                            }

                            case 'ADD_TRACK': {
                                const { roomID, trackID } = event;

                                socket.emit('MPE_ADD_TRACKS', {
                                    roomID,
                                    tracksIDs: [trackID],
                                });

                                sendBack({
                                    type: 'SENT_TRACK_TO_ADD_TO_SERVER',
                                    roomID,
                                });

                                break;
                            }

                            default: {
                                throw new Error(
                                    `Received unknown event: ${event.type}`,
                                );
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

                    ADD_TRACK: {
                        actions: forwardTo('socketConnection'),
                    },

                    SENT_TRACK_TO_ADD_TO_SERVER: {
                        actions: send(
                            playlistModel.events.SENT_TRACK_TO_ADD_TO_SERVER(),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },

                    RECEIVED_ADD_TRACKS_SUCCESS_CALLBACK: {
                        actions: send(
                            (_, { state }) =>
                                playlistModel.events.RECEIVED_TRACK_TO_ADD_SUCCESS_CALLBACK(
                                    { state },
                                ),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },

                    RECEIVED_ADD_TRACKS_FAIL_CALLBACK: {
                        actions: send(
                            playlistModel.events.RECEIVED_TRACK_TO_ADD_FAIL_CALLBACK(),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
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
                            //Add on error create mpe bool ?
                            console.log(
                                `About to merge new state from ${type} in MPE=${state.roomID}`,
                            );
                            return getPlaylistMachineActorName(state.roomID);
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
