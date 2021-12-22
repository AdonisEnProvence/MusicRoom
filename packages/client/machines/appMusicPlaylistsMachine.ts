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
import { stop } from 'xstate/lib/actions';
import { createModel } from 'xstate/lib/model';
import {
    MpeWorkflowState,
    MpeRoomClientToServerCreateArgs,
    MpeRoomClientToServerChangeTrackOrderUpDownArgs,
    MpeRoomServerToClientChangeTrackFailCallbackArgs,
    MpeRoomServerToClientChangeTrackSuccessCallbackARgs,
} from '@musicroom/types';
import { SocketClient } from '../contexts/SocketContext';
import {
    createPlaylistMachine,
    PlaylistActorRef,
    playlistModel,
} from './playlistMachine';
import { getPlaylistMachineOptions } from './options/playlistMachineOptions';

export interface MusicPlaylist {
    id: string;
    roomName: string;
    ref: PlaylistActorRef;
}

export type MusicPlaylistsContext = ContextFrom<typeof appMusicPlaylistsModel>;
export type MusicPlaylistsEvents = EventFrom<typeof appMusicPlaylistsModel>;

export const appMusicPlaylistsModel = createModel(
    {
        playlistsActorsRefs: [] as MusicPlaylist[],
    },
    {
        events: {
            CREATE_ROOM: (params: MpeRoomClientToServerCreateArgs) => ({
                params,
            }),
            SPAWN_NEW_PLAYLIST_ACTOR_FROM_STATE: (args: {
                state: MpeWorkflowState;
            }) => args,
            FORWARD_ASSIGN_MERGE_NEW_STATE_TO_INVOLVED_PLAYLIST: (
                state: MpeWorkflowState,
            ) => ({
                state,
            }),
            MPE_TRACKS_LIST_UPDATE: (args: {
                state: MpeWorkflowState;
                roomID: string;
            }) => args,
            DISPLAY_MPE_ROOM_VIEW: (args: {
                roomID: string;
                roomName: string;
            }) => args,

            //Get context
            MPE_GET_CONTEXT: (args: { roomID: string }) => args,
            RECEIVED_MPE_GET_CONTEXT_SUCCESS_CALLBACK: (args: {
                state: MpeWorkflowState;
                roomID: string;
            }) => args,
            RECEIVED_MPE_GET_CONTEXT_FAIL_CALLBACK: (args: {
                roomID: string;
            }) => args,
            ///

            //Add track
            ADD_TRACK: (args: { roomID: string; trackID: string }) => args,
            SENT_TRACK_TO_ADD_TO_SERVER: (args: { roomID: string }) => args,
            RECEIVED_ADD_TRACKS_SUCCESS_CALLBACK: (args: {
                roomID: string;
                state: MpeWorkflowState;
            }) => args,
            RECEIVED_ADD_TRACKS_FAIL_CALLBACK: (args: { roomID: string }) =>
                args,
            ///

            //Change track order
            CHANGE_TRACK_ORDER_DOWN: (
                args: MpeRoomClientToServerChangeTrackOrderUpDownArgs,
            ) => args,
            CHANGE_TRACK_ORDER_UP: (
                args: MpeRoomClientToServerChangeTrackOrderUpDownArgs,
            ) => args,
            SENT_CHANGE_TRACK_ORDER_TO_SERVER: (args: { roomID: string }) =>
                args,
            RECEIVED_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK: (
                args: MpeRoomServerToClientChangeTrackSuccessCallbackARgs,
            ) => args,
            RECEIVED_CHANGE_TRACK_ORDER_FAIL_CALLBACK: (
                args: MpeRoomServerToClientChangeTrackFailCallbackArgs,
            ) => args,
            ///

            DELETE_TRACK: (args: { roomID: string; trackID: string }) => args,
            SENT_TRACK_TO_DELETE_TO_SERVER: (args: { roomID: string }) => args,
            RECEIVED_DELETE_TRACKS_SUCCESS_CALLBACK: (args: {
                roomID: string;
                state: MpeWorkflowState;
            }) => args,
        },
    },
);

const removePlaylistActor = appMusicPlaylistsModel.assign(
    {
        playlistsActorsRefs: ({ playlistsActorsRefs }, { roomID }) => {
            return playlistsActorsRefs.filter((actor) => actor.id !== roomID);
        },
    },
    'RECEIVED_MPE_GET_CONTEXT_FAIL_CALLBACK',
);

const spawnPlaylistActor = appMusicPlaylistsModel.assign(
    {
        playlistsActorsRefs: ({ playlistsActorsRefs }, { state }) => {
            const playlistMachine = createPlaylistMachine({
                initialState: state,
                roomID: state.roomID,
            }).withConfig(getPlaylistMachineOptions());
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

const spawnPlaylistActorFromRoomID = appMusicPlaylistsModel.assign(
    {
        playlistsActorsRefs: (
            { playlistsActorsRefs },
            { roomID, roomName },
        ) => {
            const playlistMachine = createPlaylistMachine({
                initialState: undefined,
                roomID,
            }).withConfig(getPlaylistMachineOptions());

            const playlist: MusicPlaylist = {
                id: roomID,
                roomName: roomName,
                ref: spawn(playlistMachine, {
                    name: getPlaylistMachineActorName(roomID),
                }),
            };

            return [...playlistsActorsRefs, playlist];
        },
    },
    'DISPLAY_MPE_ROOM_VIEW', //how could I add several sources ? without inside actions checking event type ?
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

                    socket.on(
                        'MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
                        ({ roomID, state }) => {
                            sendBack({
                                type: 'RECEIVED_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK',
                                roomID,
                                state,
                            });
                        },
                    );

                    socket.on(
                        'MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
                        ({ roomID }) => {
                            sendBack({
                                type: 'RECEIVED_CHANGE_TRACK_ORDER_FAIL_CALLBACK',
                                roomID,
                            });
                        },
                    );

                    socket.on(
                        'MPE_DELETE_TRACKS_SUCCESS_CALLBACK',
                        ({ roomID, state }) => {
                            sendBack({
                                type: 'RECEIVED_DELETE_TRACKS_SUCCESS_CALLBACK',
                                roomID,
                                state,
                            });
                        },
                    );

                    socket.on('MPE_TRACKS_LIST_UPDATE', ({ roomID, state }) => {
                        sendBack({
                            type: 'MPE_TRACKS_LIST_UPDATE',
                            roomID,
                            state,
                        });
                    });

                    socket.on(
                        'MPE_GET_CONTEXT_SUCCESS_CALLBACK',
                        ({ state, roomID }) => {
                            sendBack({
                                type: 'RECEIVED_MPE_GET_CONTEXT_SUCCESS_CALLBACK',
                                roomID,
                                state,
                            });
                        },
                    );

                    socket.on('MPE_GET_CONTEXT_FAIL_CALLBACK', ({ roomID }) => {
                        sendBack({
                            type: 'RECEIVED_MPE_GET_CONTEXT_FAIL_CALLBACK',
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

                            case 'CHANGE_TRACK_ORDER_DOWN': {
                                const { type, ...params } = event;

                                socket.emit(
                                    'MPE_CHANGE_TRACK_ORDER_DOWN',
                                    params,
                                );

                                sendBack({
                                    type: 'SENT_CHANGE_TRACK_ORDER_TO_SERVER',
                                    roomID: params.roomID,
                                });

                                break;
                            }

                            case 'CHANGE_TRACK_ORDER_UP': {
                                const { type, ...params } = event;

                                socket.emit(
                                    'MPE_CHANGE_TRACK_ORDER_UP',
                                    params,
                                );

                                sendBack({
                                    type: 'SENT_CHANGE_TRACK_ORDER_TO_SERVER',
                                    roomID: params.roomID,
                                });

                                break;
                            }

                            case 'DELETE_TRACK': {
                                const { roomID, trackID } = event;

                                socket.emit('MPE_DELETE_TRACKS', {
                                    roomID,
                                    tracksIDs: [trackID],
                                });

                                sendBack({
                                    type: 'SENT_TRACK_TO_DELETE_TO_SERVER',
                                    roomID,
                                });

                                break;
                            }

                            case 'MPE_GET_CONTEXT': {
                                const { roomID } = event;

                                socket.emit('MPE_GET_CONTEXT', {
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

                    MPE_TRACKS_LIST_UPDATE: {
                        actions: send(
                            (_, { state }) =>
                                playlistModel.events.ASSIGN_MERGE_NEW_STATE(
                                    state,
                                ),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },

                    //Add track
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
                    ///

                    //Change track order
                    CHANGE_TRACK_ORDER_DOWN: {
                        actions: forwardTo('socketConnection'),
                    },

                    CHANGE_TRACK_ORDER_UP: {
                        actions: forwardTo('socketConnection'),
                    },

                    RECEIVED_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK: {
                        actions: send(
                            (_, { state }) =>
                                playlistModel.events.RECEIVED_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK(
                                    { state },
                                ),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },

                    RECEIVED_CHANGE_TRACK_ORDER_FAIL_CALLBACK: {
                        actions: send(
                            playlistModel.events.RECEIVED_CHANGE_TRACK_ORDER_FAIL_CALLBACK(),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },

                    SENT_CHANGE_TRACK_ORDER_TO_SERVER: {
                        actions: send(
                            playlistModel.events.SENT_CHANGE_TRACK_ORDER_TO_SERVER(),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },
                    ///

                    //Get context
                    MPE_GET_CONTEXT: {
                        actions: forwardTo('socketConnection'),
                    },

                    RECEIVED_MPE_GET_CONTEXT_FAIL_CALLBACK: {
                        actions: [
                            stop((_, event) =>
                                getPlaylistMachineActorName(event.roomID),
                            ),
                            removePlaylistActor,
                        ],
                    },

                    RECEIVED_MPE_GET_CONTEXT_SUCCESS_CALLBACK: {
                        actions: send(
                            (_, { state }) =>
                                playlistModel.events.ASSIGN_MERGE_NEW_STATE(
                                    state,
                                ),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },
                    ///

                    DELETE_TRACK: {
                        actions: forwardTo('socketConnection'),
                    },

                    SENT_TRACK_TO_DELETE_TO_SERVER: {
                        actions: send(
                            playlistModel.events.SENT_TRACK_TO_DELETE_TO_SERVER(),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },

                    RECEIVED_DELETE_TRACKS_SUCCESS_CALLBACK: {
                        actions: send(
                            (_, { state }) =>
                                playlistModel.events.RECEIVED_TRACK_TO_DELETE_SUCCESS_CALLBACK(
                                    { state },
                                ),
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

            //SHOULD BE REMOVED ??
            SPAWN_NEW_PLAYLIST_ACTOR_FROM_STATE: {
                actions: spawnPlaylistActor,
            },

            DISPLAY_MPE_ROOM_VIEW: [
                {
                    cond: ({ playlistsActorsRefs }, { roomID }) => {
                        const actorHasAlreadyBeenSpawned =
                            playlistsActorsRefs.some(
                                (actor) => actor.id === roomID,
                            );
                        return actorHasAlreadyBeenSpawned;
                    },

                    actions: 'redirectToMpeRoomView',
                },
                {
                    actions: [
                        spawnPlaylistActorFromRoomID,
                        'redirectToMpeRoomView',
                    ],
                },
            ],
        },
    });
}
