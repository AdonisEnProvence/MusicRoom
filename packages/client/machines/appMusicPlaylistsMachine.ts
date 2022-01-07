import {
    ActorRefFrom,
    ContextFrom,
    EventFrom,
    Receiver,
    Sender,
    spawn,
    send,
    forwardTo,
    assign,
} from 'xstate';
import { stop } from 'xstate/lib/actions';
import { createModel } from 'xstate/lib/model';
import {
    MpeWorkflowState,
    MpeRoomClientToServerCreateArgs,
    MpeRoomClientToServerChangeTrackOrderUpDownArgs,
    MpeRoomServerToClientChangeTrackFailCallbackArgs,
    MpeRoomServerToClientChangeTrackSuccessCallbackARgs,
    MpeRoomSummary,
    MpeWorkflowStateWithUserRelatedInformation,
    PlaylistModelMpeWorkflowState,
    MtvRoomCreationOptionsWithoutInitialTracksIDs,
} from '@musicroom/types';
import invariant from 'tiny-invariant';
import { SocketClient } from '../contexts/SocketContext';
import { navigateFromRef } from '../navigation/RootNavigation';
import {
    createPlaylistMachine,
    PlaylistActorRef,
    playlistModel,
} from './playlistMachine';
import { getPlaylistMachineOptions } from './options/playlistMachineOptions';
import {
    createCreationMpeRoomFormMachine,
    CreationMpeRoomFormDoneInvokeEvent,
} from './creationMpeRoomForm';
import {
    createCreationMtvRoomFormMachine,
    CreationMtvRoomFormDoneInvokeEvent,
} from './creationMtvRoomForm';

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

        roomToCreateInitialTracksIDs: undefined as string[] | undefined,
        currentlyDisplayedMpeRoomView: undefined as string | undefined, //MusicPlaylist ??
        currentlyExportedToMtvMpeRoomID: undefined as string | undefined,
    },
    {
        events: {
            OPEN_CREATION_FORM: (args: { initialTracksIDs: string[] }) => args,
            CLOSE_CREATION_FORM: () => ({}),

            CREATE_ROOM: (params: MpeRoomClientToServerCreateArgs) => ({
                params,
            }),
            ROOM_CREATION_ACKNOWLEDGEMENT: (
                state: MpeWorkflowStateWithUserRelatedInformation,
            ) => ({
                state,
            }),
            ROOM_IS_READY: (
                state: MpeWorkflowStateWithUserRelatedInformation,
            ) => ({
                state,
            }),
            JOIN_ROOM: (args: { roomID: string }) => args,
            LEAVE_ROOM: (args: { roomID: string }) => args,
            RECEIVED_FORCED_DISCONNECTION: (args: {
                roomSummary: MpeRoomSummary;
            }) => args,
            RECEIVED_MPE_LEAVE_ROOM_CALLBACK: (args: {
                roomSummary: MpeRoomSummary;
            }) => args,

            SET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW: (args: { roomID: string }) =>
                args,
            RESET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW: () => ({}),

            JOIN_ROOM_ACKNOWLEDGEMENT: (args: {
                roomID: string;
                state: MpeWorkflowStateWithUserRelatedInformation;
                userIsNotInRoom: boolean;
            }) => args,

            USERS_LENGTH_UPDATE: (args: {
                roomID: string;
                state: MpeWorkflowState;
            }) => args,

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
                state: PlaylistModelMpeWorkflowState;
                roomID: string;
                userIsNotInRoom: boolean;
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

            STOP_AND_REMOVE_ACTOR_FROM_PLAYLIST_LIST: (args: {
                roomID: string;
            }) => args,
            DELETE_TRACK: (args: { roomID: string; trackID: string }) => args,
            SENT_TRACK_TO_DELETE_TO_SERVER: (args: { roomID: string }) => args,
            RECEIVED_DELETE_TRACKS_SUCCESS_CALLBACK: (args: {
                roomID: string;
                state: MpeWorkflowState;
            }) => args,

            SPAWN_PLAYLIST_ACTOR_FROM_STATE: (args: {
                roomID: string;
                state: MpeWorkflowStateWithUserRelatedInformation;
            }) => args,

            EXPORT_TO_MTV_ROOM: (args: { roomID: string }) => args,
            SEND_EXPORT_TO_MTV_ROOM_TO_SERVER: (args: {
                roomID: string;
                mtvRoomOptions: MtvRoomCreationOptionsWithoutInitialTracksIDs;
            }) => args,
        },

        actions: {
            openCreationMpeFormModal: () => ({}),
            redirectToMpeLibrary: () => ({}),
            goBackToLastScreen: () => ({}),
            displayMpeForcedDisconnectionToast: () => ({}),
        },
    },
);

function actorExists(context: MusicPlaylistsContext, roomID: string): boolean {
    return context.playlistsActorsRefs.some((ref) => ref.id === roomID);
}

function givenRoomIDCurrentlyDisplayed(
    context: MusicPlaylistsContext,
    roomID: string,
): boolean {
    return context.currentlyDisplayedMpeRoomView === roomID;
}

const removePlaylistActor = appMusicPlaylistsModel.assign(
    {
        playlistsActorsRefs: ({ playlistsActorsRefs }, { roomID }) => {
            return playlistsActorsRefs.filter((actor) => actor.id !== roomID);
        },
    },
    'STOP_AND_REMOVE_ACTOR_FROM_PLAYLIST_LIST',
);

const resetCurrentlyDisplayedMpeRoomView = appMusicPlaylistsModel.assign(
    {
        currentlyDisplayedMpeRoomView: () => undefined,
    },
    'RESET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW',
);

const setCurrentlyDisplayedMpeRoomView = appMusicPlaylistsModel.assign(
    {
        currentlyDisplayedMpeRoomView: (_context, event) => event.roomID,
    },
    'SET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW',
);

const assignCurrentlyExportedToMtvMpeRoomIDToContext =
    appMusicPlaylistsModel.assign(
        {
            currentlyExportedToMtvMpeRoomID: (_context, event) => event.roomID,
        },
        'EXPORT_TO_MTV_ROOM',
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
    'SPAWN_PLAYLIST_ACTOR_FROM_STATE',
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

const assignRoomToCreateInitialTracksIDsToContext =
    appMusicPlaylistsModel.assign(
        {
            roomToCreateInitialTracksIDs: (_context, { initialTracksIDs }) =>
                initialTracksIDs,
        },
        'OPEN_CREATION_FORM',
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
    const creationMtvRoomForm = createCreationMtvRoomFormMachine({
        redirectToRoomNameScreen: () => {
            navigateFromRef('MusicPlaylistEditorExportToMtvCreationForm', {
                screen: 'MusicTrackVoteCreationFormName',
            });
        },

        redirectToOpeningStatusScreen: () => {
            navigateFromRef('MusicPlaylistEditorExportToMtvCreationForm', {
                screen: 'MusicTrackVoteCreationFormOpeningStatus',
            });
        },

        redirectToPhysicalConstraintsScreen: () => {
            navigateFromRef('MusicPlaylistEditorExportToMtvCreationForm', {
                screen: 'MusicTrackVoteCreationFormPhysicalConstraints',
            });
        },

        redirectToPlayingModeScreen: () => {
            navigateFromRef('MusicPlaylistEditorExportToMtvCreationForm', {
                screen: 'MusicTrackVoteCreationFormPlayingMode',
            });
        },

        redirectToVotesConstraintsScreen: () => {
            navigateFromRef('MusicPlaylistEditorExportToMtvCreationForm', {
                screen: 'MusicTrackVoteCreationFormVotesConstraints',
            });
        },

        redirectToConfirmationScreen: () => {
            navigateFromRef('MusicPlaylistEditorExportToMtvCreationForm', {
                screen: 'MusicTrackVoteCreationFormConfirmation',
            });
        },
    });

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
                            type: 'ROOM_CREATION_ACKNOWLEDGEMENT',
                            state,
                        });
                    });

                    socket.on('MPE_CREATE_ROOM_CALLBACK', (state) => {
                        sendBack({
                            type: 'ROOM_IS_READY',
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
                        ({ state, roomID, userIsNotInRoom }) => {
                            console.log({ userIsNotInRoom });
                            sendBack({
                                type: 'RECEIVED_MPE_GET_CONTEXT_SUCCESS_CALLBACK',
                                roomID,
                                state,
                                userIsNotInRoom,
                            });
                        },
                    );

                    socket.on('MPE_GET_CONTEXT_FAIL_CALLBACK', ({ roomID }) => {
                        sendBack({
                            type: 'RECEIVED_MPE_GET_CONTEXT_FAIL_CALLBACK',
                            roomID,
                        });
                    });

                    socket.on(
                        'MPE_JOIN_ROOM_CALLBACK',
                        ({ roomID, state, userIsNotInRoom }) => {
                            console.log('MPEJOINROOMCALLBACK', {
                                userIsNotInRoom,
                            });
                            sendBack({
                                type: 'JOIN_ROOM_ACKNOWLEDGEMENT',
                                state,
                                roomID,
                                userIsNotInRoom,
                            });
                        },
                    );

                    socket.on('MPE_LEAVE_ROOM_CALLBACK', ({ roomSummary }) => {
                        console.log('MPE_LEAVE_ROOM_CALLBACK', {
                            roomSummary,
                        });

                        sendBack({
                            type: 'RECEIVED_MPE_LEAVE_ROOM_CALLBACK',
                            roomSummary,
                        });
                    });

                    socket.on(
                        'MPE_USERS_LENGTH_UPDATE',
                        ({ roomID, state }) => {
                            sendBack({
                                type: 'USERS_LENGTH_UPDATE',
                                roomID,
                                state,
                            });
                        },
                    );

                    socket.on('MPE_FORCED_DISCONNECTION', ({ roomSummary }) => {
                        console.log(`RECEIVED MPE_FORCED_DISCONNECTION`);
                        sendBack({
                            type: 'RECEIVED_FORCED_DISCONNECTION',
                            roomSummary,
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

                            case 'JOIN_ROOM': {
                                const { roomID } = event;
                                console.log('SEND JOIN ROOM', { roomID });
                                socket.emit('MPE_JOIN_ROOM', {
                                    roomID,
                                });

                                break;
                            }

                            case 'LEAVE_ROOM': {
                                const { roomID } = event;
                                console.log('SEND Leave ROOM', { roomID });
                                socket.emit('MPE_LEAVE_ROOM', {
                                    roomID,
                                });

                                break;
                            }

                            case 'SEND_EXPORT_TO_MTV_ROOM_TO_SERVER': {
                                const { roomID, mtvRoomOptions } = event;

                                socket.emit('MPE_EXPORT_TO_MTV', {
                                    roomID,
                                    mtvRoomOptions,
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

        type: 'parallel',

        states: {
            roomCreation: {
                initial: 'waitingForRoomCreation',

                states: {
                    waitingForRoomCreation: {
                        on: {
                            OPEN_CREATION_FORM: {
                                target: 'creatingRoom',

                                actions:
                                    assignRoomToCreateInitialTracksIDsToContext,
                            },
                        },
                    },

                    creatingRoom: {
                        entry: 'openCreationMpeFormModal',

                        invoke: {
                            id: 'creationMpeRoomForm',

                            src: ({ roomToCreateInitialTracksIDs }) => {
                                invariant(
                                    roomToCreateInitialTracksIDs !== undefined,
                                    'Tracks must have been selected before trying to open MPE Room Creation Form',
                                );

                                return createCreationMpeRoomFormMachine({
                                    initialTracksIDs:
                                        roomToCreateInitialTracksIDs,
                                });
                            },

                            onDone: {
                                target: 'waitingForRoomCreationAcknowledgement',

                                actions: [
                                    send(
                                        (
                                            { roomToCreateInitialTracksIDs },
                                            {
                                                data: {
                                                    roomName,
                                                    isOpen,
                                                    onlyInvitedUsersCanVote,
                                                },
                                            }: CreationMpeRoomFormDoneInvokeEvent,
                                        ) => {
                                            invariant(
                                                roomToCreateInitialTracksIDs !==
                                                    undefined,
                                                'Tracks must have been selected before trying to open MPE Room Creation Form',
                                            );

                                            return appMusicPlaylistsModel.events.CREATE_ROOM(
                                                {
                                                    initialTrackID:
                                                        roomToCreateInitialTracksIDs[0],
                                                    name: roomName,
                                                    isOpen,
                                                    isOpenOnlyInvitedUsersCanEdit:
                                                        onlyInvitedUsersCanVote,
                                                },
                                            );
                                        },
                                        {
                                            to: 'socketConnection',
                                        },
                                    ),

                                    appMusicPlaylistsModel.actions.redirectToMpeLibrary(),
                                ],
                            },
                        },

                        on: {
                            CLOSE_CREATION_FORM: {
                                target: 'waitingForRoomCreation',

                                actions:
                                    appMusicPlaylistsModel.actions.goBackToLastScreen(),
                            },
                        },
                    },

                    waitingForRoomCreationAcknowledgement: {
                        on: {
                            ROOM_CREATION_ACKNOWLEDGEMENT: {
                                target: 'waitingForRoomReadiness',

                                actions: send((_, { state }) =>
                                    appMusicPlaylistsModel.events.SPAWN_PLAYLIST_ACTOR_FROM_STATE(
                                        {
                                            roomID: state.roomID,
                                            state,
                                        },
                                    ),
                                ),
                            },
                        },
                    },

                    waitingForRoomReadiness: {
                        on: {
                            ROOM_IS_READY: {
                                target: 'createdRoom',

                                actions: send(
                                    (_, { state }) => ({
                                        type: 'ASSIGN_MERGE_NEW_STATE',
                                        state,
                                    }),
                                    {
                                        to: (_, { state: { roomID } }) =>
                                            getPlaylistMachineActorName(roomID),
                                    },
                                ),
                            },
                        },
                    },

                    createdRoom: {
                        always: {
                            target: 'waitingForRoomCreation',
                        },
                    },
                },

                on: {
                    /**
                     * Listen to creation acknowledgement events here so that rooms created
                     * by other user's devices will be handled correctly
                     * but will not take part in the creation process.
                     *
                     * This probably not the best solution, but for now it will allow us to create rooms in tests
                     * by receiving these events.
                     */
                    ROOM_CREATION_ACKNOWLEDGEMENT: {
                        actions: send((_, { state }) =>
                            appMusicPlaylistsModel.events.SPAWN_PLAYLIST_ACTOR_FROM_STATE(
                                {
                                    roomID: state.roomID,
                                    state,
                                },
                            ),
                        ),
                    },

                    ROOM_IS_READY: {
                        actions: send(
                            (_, { state }) => ({
                                type: 'ASSIGN_MERGE_NEW_STATE',
                                state,
                            }),
                            {
                                to: (_, { state: { roomID } }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },
                    /**
                     *
                     */
                },
            },

            exportToMtvRoom: {
                initial: 'idle',

                states: {
                    idle: {
                        on: {
                            EXPORT_TO_MTV_ROOM: {
                                target: 'configuringMtvRoom',

                                actions:
                                    assignCurrentlyExportedToMtvMpeRoomIDToContext,
                            },
                        },
                    },

                    configuringMtvRoom: {
                        entry: () => {
                            navigateFromRef(
                                'MusicPlaylistEditorExportToMtvCreationForm',
                                {
                                    screen: 'MusicTrackVoteCreationFormName',
                                },
                            );
                        },

                        invoke: {
                            id: 'creationMtvRoomForm',

                            src: creationMtvRoomForm,

                            onDone: {
                                target: 'waitingForMtvRoomCreationAcknowledgement',

                                actions: [
                                    send(
                                        (
                                            { currentlyExportedToMtvMpeRoomID },
                                            {
                                                data: {
                                                    roomName,
                                                    isOpen,
                                                    onlyInvitedUsersCanVote,
                                                    hasPhysicalConstraints,
                                                    physicalConstraintPlaceID,
                                                    physicalConstraintRadius,
                                                    physicalConstraintStartsAt,
                                                    physicalConstraintEndsAt,
                                                    playingMode,
                                                    minimumVotesForATrackToBePlayed,
                                                },
                                            }: CreationMtvRoomFormDoneInvokeEvent,
                                        ) => {
                                            invariant(
                                                typeof currentlyExportedToMtvMpeRoomID ===
                                                    'string',
                                                'Room to export must have been selected before trying to open creation form',
                                            );

                                            let physicalConstraintEndsAtFormatted =
                                                '';
                                            if (
                                                hasPhysicalConstraints === true
                                            ) {
                                                invariant(
                                                    physicalConstraintEndsAt !==
                                                        undefined,
                                                    'physicalConstraintEndsAt must be defined when hasPhysicalConstraints is true',
                                                );

                                                physicalConstraintEndsAtFormatted =
                                                    physicalConstraintEndsAt.toISOString();
                                            }

                                            const mtvRoomOptions: MtvRoomCreationOptionsWithoutInitialTracksIDs =
                                                {
                                                    name: roomName,
                                                    hasPhysicalAndTimeConstraints:
                                                        hasPhysicalConstraints,
                                                    isOpen,

                                                    playingMode: playingMode,
                                                    isOpenOnlyInvitedUsersCanVote:
                                                        onlyInvitedUsersCanVote,
                                                    minimumScoreToBePlayed:
                                                        minimumVotesForATrackToBePlayed,
                                                    physicalAndTimeConstraints:
                                                        hasPhysicalConstraints ===
                                                        true
                                                            ? {
                                                                  physicalConstraintPlaceID,
                                                                  physicalConstraintRadius,
                                                                  physicalConstraintStartsAt:
                                                                      physicalConstraintStartsAt.toISOString(),
                                                                  physicalConstraintEndsAt:
                                                                      physicalConstraintEndsAtFormatted,
                                                              }
                                                            : undefined,
                                                };

                                            return appMusicPlaylistsModel.events.SEND_EXPORT_TO_MTV_ROOM_TO_SERVER(
                                                {
                                                    roomID: currentlyExportedToMtvMpeRoomID,
                                                    mtvRoomOptions,
                                                },
                                            );
                                        },
                                        {
                                            to: 'socketConnection',
                                        },
                                    ),

                                    assign({
                                        currentlyExportedToMtvMpeRoomID: (
                                            _context,
                                        ) => undefined,
                                    }),
                                ],
                            },
                        },
                    },

                    waitingForMtvRoomCreationAcknowledgement: {},
                },
            },

            roomsManagement: {
                on: {
                    LEAVE_ROOM: {
                        actions: forwardTo('socketConnection'),
                    },

                    RECEIVED_FORCED_DISCONNECTION: [
                        {
                            cond: (context, { roomSummary: { roomID } }) => {
                                return (
                                    actorExists(context, roomID) &&
                                    givenRoomIDCurrentlyDisplayed(
                                        context,
                                        roomID,
                                    )
                                );
                            },
                            actions: [
                                'displayMpeForcedDisconnectionToast',
                                `redirectToMpeLibrary`,
                                send((_, { roomSummary: { roomID } }) =>
                                    appMusicPlaylistsModel.events.STOP_AND_REMOVE_ACTOR_FROM_PLAYLIST_LIST(
                                        {
                                            roomID,
                                        },
                                    ),
                                ),
                            ],
                        },
                        {
                            cond: (context, { roomSummary: { roomID } }) =>
                                actorExists(context, roomID),
                            actions: [
                                'displayMpeForcedDisconnectionToast',
                                send((_, { roomSummary: { roomID } }) =>
                                    appMusicPlaylistsModel.events.STOP_AND_REMOVE_ACTOR_FROM_PLAYLIST_LIST(
                                        {
                                            roomID,
                                        },
                                    ),
                                ),
                            ],
                        },
                    ],

                    RECEIVED_MPE_LEAVE_ROOM_CALLBACK: [
                        {
                            cond: (context, { roomSummary: { roomID } }) => {
                                return (
                                    actorExists(context, roomID) &&
                                    givenRoomIDCurrentlyDisplayed(
                                        context,
                                        roomID,
                                    )
                                );
                            },

                            actions: [
                                `displayLeaveSuccessToast`,
                                `redirectToMpeLibrary`,
                                send((_, { roomSummary: { roomID } }) =>
                                    appMusicPlaylistsModel.events.STOP_AND_REMOVE_ACTOR_FROM_PLAYLIST_LIST(
                                        {
                                            roomID,
                                        },
                                    ),
                                ),
                            ],
                        },
                        {
                            cond: (context, { roomSummary: { roomID } }) =>
                                actorExists(context, roomID),

                            actions: [
                                `displayLeaveSuccessToast`,
                                send((_, { roomSummary: { roomID } }) =>
                                    appMusicPlaylistsModel.events.STOP_AND_REMOVE_ACTOR_FROM_PLAYLIST_LIST(
                                        {
                                            roomID,
                                        },
                                    ),
                                ),
                            ],
                        },
                    ],

                    MPE_TRACKS_LIST_UPDATE: {
                        actions: send(
                            (_, { state }) =>
                                playlistModel.events.ASSIGN_MERGE_NEW_STATE({
                                    state,
                                }),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
                    },

                    JOIN_ROOM: {
                        actions: forwardTo('socketConnection'),
                    },

                    JOIN_ROOM_ACKNOWLEDGEMENT: [
                        {
                            cond: (context, { state: { roomID } }) =>
                                actorExists(context, roomID),
                            actions: send(
                                (_, { state, userIsNotInRoom }) =>
                                    playlistModel.events.ASSIGN_MERGE_NEW_STATE(
                                        {
                                            state,
                                            userIsNotInRoom,
                                        },
                                    ),
                                {
                                    to: (_, { roomID }) =>
                                        getPlaylistMachineActorName(roomID),
                                },
                            ),
                        },
                        {
                            actions: send((_, { state }) =>
                                appMusicPlaylistsModel.events.SPAWN_PLAYLIST_ACTOR_FROM_STATE(
                                    {
                                        roomID: state.roomID,
                                        state,
                                    },
                                ),
                            ),
                        },
                    ],

                    SPAWN_PLAYLIST_ACTOR_FROM_STATE: {
                        actions: spawnPlaylistActor,
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
                            'displayGetContextFailureToast',
                            'navigateToMpeRoomsSearchScreen',
                            send((_, { roomID }) =>
                                appMusicPlaylistsModel.events.STOP_AND_REMOVE_ACTOR_FROM_PLAYLIST_LIST(
                                    {
                                        roomID,
                                    },
                                ),
                            ),
                        ],
                    },

                    RECEIVED_MPE_GET_CONTEXT_SUCCESS_CALLBACK: {
                        actions: send(
                            (_, { state, userIsNotInRoom }) =>
                                playlistModel.events.ASSIGN_MERGE_NEW_STATE({
                                    state,
                                    userIsNotInRoom,
                                }),
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

                    STOP_AND_REMOVE_ACTOR_FROM_PLAYLIST_LIST: {
                        actions: [
                            stop((_, event) =>
                                getPlaylistMachineActorName(event.roomID),
                            ),
                            removePlaylistActor,
                        ],
                    },

                    USERS_LENGTH_UPDATE: {
                        actions: send(
                            (_, { state }) =>
                                playlistModel.events.ASSIGN_MERGE_NEW_STATE({
                                    state,
                                }),
                            {
                                to: (_, { roomID }) =>
                                    getPlaylistMachineActorName(roomID),
                            },
                        ),
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

                            actions: 'navigateToMpeRoomView',
                        },
                        {
                            actions: [
                                spawnPlaylistActorFromRoomID,
                                'navigateToMpeRoomView',
                            ],
                        },
                    ],

                    RESET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW: {
                        actions: resetCurrentlyDisplayedMpeRoomView,
                    },

                    SET_CURRENTLY_DISPLAYED_MPE_ROOM_VIEW: {
                        actions: setCurrentlyDisplayedMpeRoomView,
                    },
                },
            },
        },

        preserveActionOrder: true,
    });
}
