import {
    MtvRoomChatMessage,
    MtvRoomClientToServerCreateArgs,
    MtvRoomGetRoomConstraintDetailsCallbackArgs,
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import { nanoid } from 'nanoid/non-secure';
import {
    ActorRef,
    assign,
    createMachine,
    EventFrom,
    forwardTo,
    Receiver,
    send,
    Sender,
    sendParent,
    State,
    StateMachine,
} from 'xstate';
import { SocketClient } from '../contexts/SocketContext';
import { navigateFromRef } from '../navigation/RootNavigation';
import { appModel } from './appModel';
import {
    createCreationMtvRoomFormMachine,
    CreationMtvRoomFormDoneInvokeEvent,
    creationMtvRoomFormInitialContext,
    CreationMtvRoomFormMachineContext,
} from './creationMtvRoomForm';
import { assertEventType } from './utils';

export interface AppMusicPlayerMachineContext extends MtvWorkflowState {
    progressElapsedTime: number;

    initialTracksIDs?: string[];
    closeSuggestionModal?: () => void;
    closeMtvRoomCreationModal?: () => void;

    chatMessages?: MtvRoomChatMessage[];
    constraintsDetails?: MtvRoomGetRoomConstraintDetailsCallbackArgs;
}

export type AppMusicPlayerMachineActorRef = ActorRef<
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState
>;

export type AppMusicPlayerMachineState = State<
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent
>;

export type CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents =
    | {
          type: 'EXIT_MTV_ROOM_CREATION';
      }
    | { type: 'SAVE_MTV_ROOM_CREATION_MODAL_CLOSER'; closeModal: () => void };

export type AppMusicPlayerMachineEvent =
    | {
          type: 'CREATE_ROOM';
          roomName: string;
          initialTracksIDs: string[];
      }
    | { type: 'JOINED_ROOM'; state: MtvWorkflowState }
    | { type: 'JOINED_CREATED_ROOM'; state: MtvWorkflowState }
    | { type: 'ROOM_IS_READY'; state: MtvWorkflowState }
    | { type: 'JOIN_ROOM'; roomID: string }
    | { type: 'TRACK_HAS_LOADED' }
    | {
          type: 'UPDATE_CURRENT_TRACK_ELAPSED_TIME';
          elapsedTime: number;
      }
    | {
          type: 'PLAY_PAUSE_TOGGLE';
      }
    | {
          type: 'EMIT_ACTION_PLAY';
      }
    | {
          type: 'EMIT_ACTION_PAUSE';
      }
    | { type: 'GO_TO_NEXT_TRACK' }
    | { type: 'CHANGE_EMITTING_DEVICE'; deviceID: string }
    | { type: 'PLAY_CALLBACK'; state: MtvWorkflowState }
    | { type: 'TIME_CONSTRAINT_UPDATE'; state: MtvWorkflowState }
    | { type: 'FORCED_DISCONNECTION' }
    | { type: 'LEAVE_ROOM' }
    | { type: 'LEAVE_ROOM_CALLBACK' }
    | { type: 'UPDATE_DELEGATION_OWNER'; newDelegationOwnerUserID: string }
    | { type: 'UPDATE_DELEGATION_OWNER_CALLBACK'; state: MtvWorkflowState }
    | { type: 'USER_LENGTH_UPDATE'; state: MtvWorkflowState }
    | {
          type: 'USER_PERMISSIONS_UPDATE';
          state: MtvWorkflowStateWithUserRelatedInformation;
      }
    | { type: 'FOCUS_READY' }
    | { type: 'CHANGE_EMITTING_DEVICE_CALLBACK'; state: MtvWorkflowState }
    | { type: '__GET_CONTEXT' }
    | {
          type: 'RETRIEVE_CONTEXT';
          state: MtvWorkflowState;
      }
    | { type: 'PAUSE_CALLBACK'; state: MtvWorkflowState }
    | {
          type: 'SUGGEST_TRACKS';
          tracksToSuggest: string[];
          closeSuggestionModal: () => void;
      }
    | { type: 'VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE'; state: MtvWorkflowState }
    | { type: 'SUGGEST_TRACKS_CALLBACK' }
    | { type: 'SUGGEST_TRACKS_FAIL_CALLBACK' }
    | {
          type: 'VOTE_OR_SUGGEST_TRACK_CALLBACK';
          state: MtvWorkflowStateWithUserRelatedInformation;
      }
    | { type: 'VOTE_FOR_TRACK'; trackID: string }
    | {
          type: 'UPDATE_CONTROL_AND_DELEGATION_PERMISSION';
          toUpdateUserID: string;
          hasControlAndDelegationPermission: boolean;
      }
    | {
          type: 'SEND_CHAT_MESSAGE';
          message: string;
      }
    | {
          type: 'RECEIVED_CHAT_MESSAGE';
          message: MtvRoomChatMessage;
      }
    | { type: 'GET_ROOM_CONSTRAINTS_DETAILS' }
    | {
          type: 'GET_ROOM_CONSTRAINTS_DETAILS_CALLBACK';
          payload: MtvRoomGetRoomConstraintDetailsCallbackArgs;
      }
    | { type: 'CREATOR_INVITE_USER'; invitedUserID: string }
    | CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents
    | EventFrom<
          typeof appModel,
          '__ENTER_MPE_EXPORT_TO_MTV' | '__EXIT_MPE_EXPORT_TO_MTV'
      >;

interface CreateAppMusicPlayerMachineArgs {
    socket: SocketClient;
}

const rawContext: AppMusicPlayerMachineContext = {
    name: '',
    playing: false,
    roomCreatorUserID: '',
    roomID: '',
    tracks: null,
    userRelatedInformation: null,
    usersLength: 0,
    currentTrack: null,
    progressElapsedTime: 0,
    initialTracksIDs: undefined,
    delegationOwnerUserID: null,
    closeMtvRoomCreationModal: undefined,
    playingMode: 'BROADCAST',
    closeSuggestionModal: undefined,
    hasTimeAndPositionConstraints: false,
    isOpen: true,
    isOpenOnlyInvitedUsersCanVote: false,
    timeConstraintIsValid: null,
    minimumScoreToBePlayed: 1,
    chatMessages: undefined,
    constraintsDetails: undefined,
};

export const createAppMusicPlayerMachine = ({
    socket,
}: CreateAppMusicPlayerMachineArgs): StateMachine<
    AppMusicPlayerMachineContext,
    any,
    AppMusicPlayerMachineEvent
> => {
    const creationMtvRoomForm = createCreationMtvRoomFormMachine({
        redirectToRoomNameScreen: () => {
            try {
                navigateFromRef('MusicTrackVoteCreationForm', {
                    screen: 'MusicTrackVoteCreationFormName',
                });
            } catch {
                // An error is thrown when the modal is open.
                // We are not yet in MusicTrackVoteCreationForm and
                // we can there is no screen called MusicTrackVoteCreationFormName.
                // This is not a problem that the first call does not succeed
                // as we already perform the redirection in openCreationMtvRoomFormModal action.
                // It is particularly useful to handle redirection to Name step.
            }
        },

        redirectToOpeningStatusScreen: () => {
            navigateFromRef('MusicTrackVoteCreationForm', {
                screen: 'MusicTrackVoteCreationFormOpeningStatus',
            });
        },

        redirectToPhysicalConstraintsScreen: () => {
            navigateFromRef('MusicTrackVoteCreationForm', {
                screen: 'MusicTrackVoteCreationFormPhysicalConstraints',
            });
        },

        redirectToPlayingModeScreen: () => {
            navigateFromRef('MusicTrackVoteCreationForm', {
                screen: 'MusicTrackVoteCreationFormPlayingMode',
            });
        },

        redirectToVotesConstraintsScreen: () => {
            navigateFromRef('MusicTrackVoteCreationForm', {
                screen: 'MusicTrackVoteCreationFormVotesConstraints',
            });
        },

        redirectToConfirmationScreen: () => {
            navigateFromRef('MusicTrackVoteCreationForm', {
                screen: 'MusicTrackVoteCreationFormConfirmation',
            });
        },
    });

    return createMachine<
        AppMusicPlayerMachineContext,
        AppMusicPlayerMachineEvent
    >(
        {
            id: 'AppMusicPlayer',

            invoke: {
                id: 'socketConnection',
                src:
                    () =>
                    (
                        sendBack: Sender<AppMusicPlayerMachineEvent>,
                        onReceive: Receiver<AppMusicPlayerMachineEvent>,
                    ) => {
                        socket.on('MTV_RETRIEVE_CONTEXT', (state) => {
                            sendBack({
                                type: 'RETRIEVE_CONTEXT',
                                state,
                            });
                        });

                        socket.on('MTV_USER_LENGTH_UPDATE', (state) => {
                            console.log('USER_LENGTH_UPDATE');
                            sendBack({
                                type: 'USER_LENGTH_UPDATE',
                                state,
                            });
                        });

                        socket.on(
                            'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
                            (state) => {
                                sendBack({
                                    type: 'JOINED_CREATED_ROOM',
                                    state,
                                });
                            },
                        );

                        socket.on(
                            'MTV_CHANGE_EMITTING_DEVICE_CALLBACK',
                            (state) => {
                                sendBack({
                                    type: 'CHANGE_EMITTING_DEVICE_CALLBACK',
                                    state,
                                });
                            },
                        );

                        socket.on('MTV_CREATE_ROOM_CALLBACK', (state) => {
                            sendBack({
                                type: 'ROOM_IS_READY',
                                state,
                            });
                        });

                        socket.on('MTV_JOIN_ROOM_CALLBACK', (state) => {
                            sendBack({
                                type: 'JOINED_ROOM',
                                state,
                            });
                        });

                        socket.on('MTV_ACTION_PLAY_CALLBACK', (state) => {
                            sendBack({
                                type: 'PLAY_CALLBACK',
                                state,
                            });
                        });

                        socket.on('MTV_ACTION_PAUSE_CALLBACK', (state) => {
                            sendBack({
                                type: 'PAUSE_CALLBACK',
                                state,
                            });
                        });

                        socket.on(
                            'MTV_VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
                            (state) => {
                                sendBack({
                                    type: 'VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
                                    state,
                                });
                            },
                        );

                        socket.on('MTV_USER_PERMISSIONS_UPDATE', (state) => {
                            sendBack({
                                type: 'USER_PERMISSIONS_UPDATE',
                                state,
                            });
                        });

                        socket.on(
                            'MTV_VOTE_OR_SUGGEST_TRACK_CALLBACK',
                            (state) => {
                                console.log(
                                    'RECEIVED VOTE FOR TRACK CALLBACK',
                                    state,
                                );
                                sendBack({
                                    type: 'VOTE_OR_SUGGEST_TRACK_CALLBACK',
                                    state,
                                });
                            },
                        );

                        socket.on('MTV_SUGGEST_TRACKS_CALLBACK', () => {
                            sendBack({
                                type: 'SUGGEST_TRACKS_CALLBACK',
                            });
                        });

                        socket.on('MTV_SUGGEST_TRACKS_FAIL_CALLBACK', () => {
                            sendBack({
                                type: 'SUGGEST_TRACKS_FAIL_CALLBACK',
                            });
                        });

                        socket.on(
                            'MTV_UPDATE_DELEGATION_OWNER_CALLBACK',
                            (state) => {
                                sendBack({
                                    type: 'UPDATE_DELEGATION_OWNER_CALLBACK',
                                    state,
                                });
                            },
                        );

                        socket.on('MTV_RECEIVED_MESSAGE', ({ message }) => {
                            sendBack({
                                type: 'RECEIVED_CHAT_MESSAGE',
                                message,
                            });
                        });

                        socket.on('MTV_FORCED_DISCONNECTION', () => {
                            sendBack({
                                type: 'FORCED_DISCONNECTION',
                            });
                        });

                        socket.on('MTV_TIME_CONSTRAINT_UPDATE', (state) => {
                            sendBack({
                                type: 'TIME_CONSTRAINT_UPDATE',
                                state,
                            });
                        });

                        socket.on('MTV_LEAVE_ROOM_CALLBACK', () => {
                            sendBack({
                                type: 'LEAVE_ROOM_CALLBACK',
                            });
                        });

                        onReceive((event) => {
                            switch (event.type) {
                                case '__GET_CONTEXT': {
                                    socket.emit('MTV_GET_CONTEXT');

                                    break;
                                }

                                case 'EMIT_ACTION_PLAY': {
                                    socket.emit('MTV_ACTION_PLAY');

                                    break;
                                }

                                case 'EMIT_ACTION_PAUSE': {
                                    socket.emit('MTV_ACTION_PAUSE');

                                    break;
                                }

                                case 'GO_TO_NEXT_TRACK': {
                                    socket.emit('MTV_GO_TO_NEXT_TRACK');

                                    break;
                                }

                                case 'UPDATE_DELEGATION_OWNER': {
                                    const { newDelegationOwnerUserID } = event;

                                    socket.emit('MTV_UPDATE_DELEGATION_OWNER', {
                                        newDelegationOwnerUserID,
                                    });

                                    break;
                                }

                                case 'LEAVE_ROOM': {
                                    socket.emit('MTV_LEAVE_ROOM');

                                    break;
                                }

                                case 'CHANGE_EMITTING_DEVICE': {
                                    socket.emit('MTV_CHANGE_EMITTING_DEVICE', {
                                        newEmittingDeviceID: event.deviceID,
                                    });

                                    break;
                                }

                                case 'SUGGEST_TRACKS': {
                                    const tracksToSuggest =
                                        event.tracksToSuggest;

                                    socket.emit('MTV_SUGGEST_TRACKS', {
                                        tracksToSuggest,
                                    });

                                    break;
                                }

                                case 'VOTE_FOR_TRACK': {
                                    socket.emit('MTV_VOTE_FOR_TRACK', {
                                        trackID: event.trackID,
                                    });

                                    break;
                                }

                                case 'UPDATE_CONTROL_AND_DELEGATION_PERMISSION': {
                                    const {
                                        toUpdateUserID,
                                        hasControlAndDelegationPermission,
                                    } = event;

                                    socket.emit(
                                        'MTV_UPDATE_CONTROL_AND_DELEGATION_PERMISSION',
                                        {
                                            toUpdateUserID,
                                            hasControlAndDelegationPermission,
                                        },
                                    );

                                    break;
                                }

                                case 'SEND_CHAT_MESSAGE': {
                                    socket.emit('MTV_NEW_MESSAGE', {
                                        message: event.message,
                                    });

                                    break;
                                }

                                case 'CREATOR_INVITE_USER': {
                                    const { invitedUserID } = event;

                                    socket.emit('MTV_CREATOR_INVITE_USER', {
                                        invitedUserID,
                                    });

                                    break;
                                }

                                case 'GET_ROOM_CONSTRAINTS_DETAILS': {
                                    socket.emit(
                                        'MTV_GET_ROOM_CONSTRAINTS_DETAILS',
                                        (args) => {
                                            sendBack({
                                                type: 'GET_ROOM_CONSTRAINTS_DETAILS_CALLBACK',
                                                payload: args,
                                            });
                                        },
                                    );
                                    break;
                                }
                            }
                        });
                    },
            },

            context: rawContext,

            initial: 'waitingForFocusPage',

            states: {
                /**
                 * As the youtube player won't autoplay is the page is not focus on the web
                 * we need to wait for the user's focus before asking for stored context
                 */
                waitingForFocusPage: {
                    invoke: {
                        src: 'listenForFocus',
                    },

                    on: {
                        FOCUS_READY: {
                            target: 'pageHasBeenFocused',
                        },
                    },
                },

                pageHasBeenFocused: {
                    initial: 'requestingInitialContext',

                    states: {
                        requestingInitialContext: {
                            entry: [
                                'assignRawContext',
                                send(
                                    {
                                        type: '__GET_CONTEXT',
                                    },
                                    {
                                        to: 'socketConnection',
                                    },
                                ),
                            ],

                            always: {
                                target: 'settledInitialContext',
                            },
                        },

                        settledInitialContext: {
                            type: 'parallel',

                            states: {
                                connectionToRoom: {
                                    initial: 'disconnected',

                                    states: {
                                        disconnected: {},

                                        connected: {
                                            type: 'parallel',

                                            states: {
                                                playerState: {
                                                    initial: 'init',

                                                    states: {
                                                        init: {
                                                            always: [
                                                                {
                                                                    target: 'waitingForTrackToLoad',
                                                                    cond: 'roomHasPositionAndTimeConstraints',
                                                                    actions:
                                                                        sendParent(
                                                                            'REQUEST_LOCATION_PERMISSION',
                                                                        ),
                                                                },
                                                                {
                                                                    target: 'waitingForTrackToLoad',
                                                                },
                                                            ],
                                                        },

                                                        waitingForTrackToLoad: {
                                                            on: {
                                                                TRACK_HAS_LOADED:
                                                                    {
                                                                        target: 'loadingTrackDuration',
                                                                    },
                                                            },
                                                        },

                                                        loadingTrackDuration: {
                                                            always: [
                                                                {
                                                                    cond: ({
                                                                        playing,
                                                                    }) =>
                                                                        playing ===
                                                                        true,
                                                                    target: 'activatedPlayer.play',
                                                                },

                                                                {
                                                                    target: 'activatedPlayer.pause',
                                                                },
                                                            ],
                                                        },

                                                        activatedPlayer: {
                                                            initial: 'pause',

                                                            tags: 'playerIsReady',

                                                            states: {
                                                                pause: {
                                                                    initial:
                                                                        'idle',

                                                                    states: {
                                                                        idle: {
                                                                            on: {
                                                                                PLAY_PAUSE_TOGGLE:
                                                                                    {
                                                                                        target: 'waitingServerAcknowledgement',
                                                                                    },
                                                                            },
                                                                        },

                                                                        waitingServerAcknowledgement:
                                                                            {
                                                                                entry: send(
                                                                                    () => ({
                                                                                        type: 'EMIT_ACTION_PLAY',
                                                                                    }),
                                                                                    {
                                                                                        to: 'socketConnection',
                                                                                    },
                                                                                ),
                                                                            },
                                                                    },
                                                                },

                                                                play: {
                                                                    invoke: {
                                                                        src: 'pollTrackElapsedTime',
                                                                    },

                                                                    initial:
                                                                        'idle',

                                                                    states: {
                                                                        idle: {
                                                                            on: {
                                                                                PLAY_PAUSE_TOGGLE:
                                                                                    {
                                                                                        target: 'waitingServerAcknowledgement',
                                                                                    },
                                                                            },
                                                                        },

                                                                        waitingServerAcknowledgement:
                                                                            {
                                                                                entry: send(
                                                                                    () => ({
                                                                                        type: 'EMIT_ACTION_PAUSE',
                                                                                    }),
                                                                                    {
                                                                                        to: 'socketConnection',
                                                                                    },
                                                                                ),
                                                                            },
                                                                    },

                                                                    on: {
                                                                        UPDATE_CURRENT_TRACK_ELAPSED_TIME:
                                                                            {
                                                                                actions:
                                                                                    'assignElapsedTimeToContext',
                                                                            },
                                                                    },
                                                                },
                                                            },

                                                            on: {
                                                                PAUSE_CALLBACK:
                                                                    {
                                                                        target: 'activatedPlayer.pause',
                                                                        actions:
                                                                            'assignMergeNewState',
                                                                    },

                                                                PLAY_CALLBACK: [
                                                                    {
                                                                        target: 'waitingForTrackToLoad',

                                                                        /**
                                                                         * Checking if we're on a new track
                                                                         * Which means to reload a video in the players
                                                                         */
                                                                        cond: (
                                                                            {
                                                                                currentTrack,
                                                                            },
                                                                            {
                                                                                state: {
                                                                                    currentTrack:
                                                                                        currentTrackToBeSet,
                                                                                },
                                                                            },
                                                                        ) => {
                                                                            const isDifferentCurrentTrack =
                                                                                currentTrack?.id !==
                                                                                currentTrackToBeSet?.id;

                                                                            return isDifferentCurrentTrack;
                                                                        },

                                                                        actions:
                                                                            'assignMergeNewState',
                                                                    },

                                                                    {
                                                                        target: 'activatedPlayer.play',
                                                                        actions:
                                                                            'assignMergeNewState',
                                                                    },
                                                                ],

                                                                GO_TO_NEXT_TRACK:
                                                                    {
                                                                        actions:
                                                                            forwardTo(
                                                                                'socketConnection',
                                                                            ),
                                                                    },
                                                            },
                                                        },
                                                    },

                                                    on: {
                                                        /**
                                                         * PAUSE_CALLBACK event must be handled in all substates, including waitingForTrackToLoad.
                                                         * The updated state must be assigned to the context.
                                                         */
                                                        PAUSE_CALLBACK: {
                                                            actions:
                                                                'assignMergeNewState',
                                                        },

                                                        /**
                                                         * PLAY_CALLBACK event must be handled in all substates, including waitingForTrackToLoad.
                                                         * The updated state must be assigned to the context.
                                                         */
                                                        PLAY_CALLBACK: {
                                                            actions:
                                                                'assignMergeNewState',
                                                        },
                                                    },
                                                },

                                                tracksSuggestion: {
                                                    initial:
                                                        'waitingForTracksToBeSuggested',

                                                    states: {
                                                        waitingForTracksToBeSuggested:
                                                            {
                                                                on: {
                                                                    SUGGEST_TRACKS:
                                                                        {
                                                                            target: 'waitingForTracksSuggestionToBeAcknowledged',

                                                                            actions:
                                                                                [
                                                                                    assign(
                                                                                        {
                                                                                            closeSuggestionModal:
                                                                                                (
                                                                                                    _context,
                                                                                                    {
                                                                                                        closeSuggestionModal,
                                                                                                    },
                                                                                                ) =>
                                                                                                    closeSuggestionModal,
                                                                                        },
                                                                                    ),

                                                                                    send(
                                                                                        (
                                                                                            _context,
                                                                                            event,
                                                                                        ) => ({
                                                                                            type: 'SUGGEST_TRACKS',
                                                                                            tracksToSuggest:
                                                                                                event.tracksToSuggest,
                                                                                        }),
                                                                                        {
                                                                                            to: 'socketConnection',
                                                                                        },
                                                                                    ),
                                                                                ],
                                                                        },
                                                                },
                                                            },

                                                        waitingForTracksSuggestionToBeAcknowledged:
                                                            {
                                                                tags: [
                                                                    'showActivityIndicatorOnSuggestionsResultsScreen',
                                                                ],

                                                                on: {
                                                                    SUGGEST_TRACKS_CALLBACK:
                                                                        {
                                                                            target: 'waitingForTracksToBeSuggested',

                                                                            actions:
                                                                                [
                                                                                    ({
                                                                                        closeSuggestionModal,
                                                                                    }) => {
                                                                                        closeSuggestionModal?.();
                                                                                    },

                                                                                    'showTracksSuggestionAcknowledgementToast',
                                                                                ],
                                                                        },
                                                                    SUGGEST_TRACKS_FAIL_CALLBACK:
                                                                        {
                                                                            target: 'waitingForTracksToBeSuggested',

                                                                            actions:
                                                                                [
                                                                                    ({
                                                                                        closeSuggestionModal,
                                                                                    }) => {
                                                                                        closeSuggestionModal?.();
                                                                                    },

                                                                                    'showTracksSuggestionFailedToast',
                                                                                ],
                                                                        },
                                                                },
                                                            },
                                                    },

                                                    on: {
                                                        VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE:
                                                            {
                                                                actions:
                                                                    'assignMergeNewState',
                                                            },
                                                    },
                                                },
                                            },

                                            on: {
                                                FORCED_DISCONNECTION: {
                                                    target: 'disconnected',

                                                    actions: [
                                                        'assignRawContext',
                                                        'displayAlertForcedDisconnectionToastAndMinimizeMusicPlayer',
                                                    ],
                                                },

                                                LEAVE_ROOM: {
                                                    actions:
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                },

                                                LEAVE_ROOM_CALLBACK: {
                                                    target: 'disconnected',

                                                    actions: [
                                                        'assignRawContext',
                                                        'leaveRoomFromLeaveRoomButton',
                                                    ],
                                                },

                                                TIME_CONSTRAINT_UPDATE: {
                                                    actions:
                                                        'assignMergeNewState',
                                                },

                                                CHANGE_EMITTING_DEVICE: {
                                                    cond: (
                                                        {
                                                            userRelatedInformation,
                                                        },
                                                        { deviceID },
                                                    ) => {
                                                        if (
                                                            userRelatedInformation !==
                                                            null
                                                        ) {
                                                            const pickedDeviceIsNotEmitting =
                                                                userRelatedInformation.emittingDeviceID !==
                                                                deviceID;

                                                            return pickedDeviceIsNotEmitting;
                                                        }
                                                        return false;
                                                    },

                                                    actions:
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                },

                                                CHANGE_EMITTING_DEVICE_CALLBACK:
                                                    {
                                                        cond: ({
                                                            userRelatedInformation,
                                                        }) => {
                                                            const userRelatedInformationIsNotNull =
                                                                userRelatedInformation !==
                                                                null;

                                                            if (
                                                                userRelatedInformationIsNotNull ===
                                                                false
                                                            ) {
                                                                console.error(
                                                                    'UserRelatedInformation should not be null',
                                                                );
                                                            }

                                                            return userRelatedInformationIsNotNull;
                                                        },
                                                        actions: `assignMergeNewState`,
                                                    },

                                                VOTE_FOR_TRACK: {
                                                    cond: 'canVoteForTrack',
                                                    actions:
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                },

                                                VOTE_OR_SUGGEST_TRACK_CALLBACK:
                                                    {
                                                        actions:
                                                            'assignMergeNewState',
                                                    },

                                                USER_LENGTH_UPDATE: {
                                                    actions:
                                                        'assignMergeNewState',
                                                },

                                                USER_PERMISSIONS_UPDATE: {
                                                    actions:
                                                        'assignMergeNewState',
                                                },

                                                UPDATE_DELEGATION_OWNER: {
                                                    actions:
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                },

                                                UPDATE_CONTROL_AND_DELEGATION_PERMISSION:
                                                    {
                                                        actions:
                                                            forwardTo(
                                                                'socketConnection',
                                                            ),
                                                    },

                                                UPDATE_DELEGATION_OWNER_CALLBACK:
                                                    {
                                                        actions:
                                                            'assignMergeNewState',
                                                    },

                                                GET_ROOM_CONSTRAINTS_DETAILS: {
                                                    actions:
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                },

                                                GET_ROOM_CONSTRAINTS_DETAILS_CALLBACK:
                                                    {
                                                        actions:
                                                            'assignConstraintsDetails',
                                                    },

                                                SEND_CHAT_MESSAGE: {
                                                    actions: [
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                        assign({
                                                            chatMessages: (
                                                                {
                                                                    chatMessages,
                                                                    userRelatedInformation,
                                                                },
                                                                { message },
                                                            ) => {
                                                                if (
                                                                    userRelatedInformation ===
                                                                    null
                                                                ) {
                                                                    throw new Error(
                                                                        'userRelatedInformation must not be null to use chat',
                                                                    );
                                                                }

                                                                const previousMessages =
                                                                    chatMessages ??
                                                                    [];

                                                                // Messages must be prepend as they are displayed in reverse order.
                                                                return [
                                                                    {
                                                                        id: nanoid(),
                                                                        authorID:
                                                                            userRelatedInformation.userID,
                                                                        authorName:
                                                                            'Me',
                                                                        text: message,
                                                                    },
                                                                    ...previousMessages,
                                                                ];
                                                            },
                                                        }),
                                                    ],
                                                },

                                                RECEIVED_CHAT_MESSAGE: {
                                                    actions: assign({
                                                        chatMessages: (
                                                            { chatMessages },
                                                            { message },
                                                        ) => {
                                                            const previousMessages =
                                                                chatMessages ??
                                                                [];

                                                            // Messages must be prepend as they are displayed in reverse order.
                                                            return [
                                                                message,
                                                                ...previousMessages,
                                                            ];
                                                        },
                                                    }),
                                                },

                                                CREATOR_INVITE_USER: {
                                                    actions:
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                },
                                            },
                                        },
                                    },

                                    on: {
                                        RETRIEVE_CONTEXT: {
                                            target: '.connected',

                                            actions: 'assignMergeNewState',
                                        },

                                        JOINED_ROOM: {
                                            target: '.connected',
                                        },

                                        ROOM_IS_READY: {
                                            target: '.connected',
                                        },
                                    },
                                },

                                creatingRoom: {
                                    initial: 'waitingForRoomCreationRequest',

                                    states: {
                                        waitingForRoomCreationRequest: {
                                            on: {
                                                CREATE_ROOM: {
                                                    target: 'selectingRoomOptions',

                                                    actions: assign(
                                                        (context, event) => ({
                                                            ...context,
                                                            initialTracksIDs:
                                                                event.initialTracksIDs,
                                                        }),
                                                    ),
                                                },
                                            },
                                        },

                                        selectingRoomOptions: {
                                            entry: 'openCreationMtvRoomFormModal',

                                            exit: 'closeCreationMtvRoomFormModal',

                                            invoke: {
                                                id: 'creationMtvRoomForm',

                                                src: creationMtvRoomForm,

                                                data: (
                                                    { initialTracksIDs },
                                                    event,
                                                ): CreationMtvRoomFormMachineContext => {
                                                    assertEventType(
                                                        event,
                                                        'CREATE_ROOM',
                                                    );

                                                    if (
                                                        initialTracksIDs ===
                                                        undefined
                                                    ) {
                                                        throw new Error(
                                                            'Initial tracks must have been assigned to the context',
                                                        );
                                                    }

                                                    return {
                                                        ...creationMtvRoomFormInitialContext,
                                                        initialTracksIDs,
                                                    };
                                                },

                                                onDone: {
                                                    target: 'connectingToRoom',

                                                    actions: (
                                                        _,
                                                        event: CreationMtvRoomFormDoneInvokeEvent,
                                                    ) => {
                                                        console.log(
                                                            'done event',
                                                            event,
                                                        );
                                                    },
                                                },
                                            },

                                            on: {
                                                SAVE_MTV_ROOM_CREATION_MODAL_CLOSER:
                                                    {
                                                        actions: assign({
                                                            closeMtvRoomCreationModal:
                                                                (
                                                                    _context,
                                                                    event,
                                                                ) =>
                                                                    event.closeModal,
                                                        }),
                                                    },
                                            },
                                        },

                                        connectingToRoom: {
                                            invoke: {
                                                src: (context, event) => () => {
                                                    const creationMtvRoomFormDoneInvokeEvent =
                                                        event as CreationMtvRoomFormDoneInvokeEvent;

                                                    const { initialTracksIDs } =
                                                        context;
                                                    if (
                                                        initialTracksIDs ===
                                                        undefined
                                                    ) {
                                                        return;
                                                    }

                                                    const {
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
                                                    } = creationMtvRoomFormDoneInvokeEvent;
                                                    let physicalConstraintEndsAtFormatted =
                                                        '';
                                                    if (
                                                        hasPhysicalConstraints ===
                                                        true
                                                    ) {
                                                        if (
                                                            physicalConstraintEndsAt ===
                                                            undefined
                                                        ) {
                                                            throw new Error(
                                                                'physicalConstraintEndsAt is undefined',
                                                            );
                                                        }

                                                        physicalConstraintEndsAtFormatted =
                                                            physicalConstraintEndsAt.toISOString();
                                                    }

                                                    const payload: MtvRoomClientToServerCreateArgs =
                                                        {
                                                            name: roomName,
                                                            initialTracksIDs:
                                                                initialTracksIDs,
                                                            hasPhysicalAndTimeConstraints:
                                                                hasPhysicalConstraints,
                                                            isOpen,

                                                            playingMode:
                                                                playingMode,
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

                                                    socket.emit(
                                                        'MTV_CREATE_ROOM',
                                                        payload,
                                                    );
                                                },
                                            },

                                            on: {
                                                JOINED_CREATED_ROOM: {
                                                    target: 'roomIsNotReady',
                                                    //redirect here
                                                    actions: [
                                                        'assignMergeNewState',
                                                        `expandMusicPlayerFullScreen`,
                                                    ],
                                                },
                                            },
                                        },

                                        roomIsNotReady: {
                                            on: {
                                                // When receiving ROOM_IS_READY event,
                                                // connectionToRoom state will go to connected substate.
                                                ROOM_IS_READY: {
                                                    target: 'waitingForRoomCreationRequest',

                                                    actions: [
                                                        'assignMergeNewState',
                                                    ],
                                                },
                                            },
                                        },
                                    },

                                    on: {
                                        EXIT_MTV_ROOM_CREATION: {
                                            target: '.waitingForRoomCreationRequest',
                                        },

                                        JOINED_CREATED_ROOM: {
                                            target: '.roomIsNotReady',

                                            actions: 'assignMergeNewState',
                                        },

                                        // When receiving ROOM_IS_READY event,
                                        // connectionToRoom state will go to connected substate.
                                        ROOM_IS_READY: {
                                            target: '.waitingForRoomCreationRequest',

                                            actions: 'assignMergeNewState',
                                        },
                                    },
                                },

                                joiningRoom: {
                                    initial: 'waitingToJoinRoom',

                                    states: {
                                        waitingToJoinRoom: {
                                            on: {
                                                JOIN_ROOM: {
                                                    target: 'joiningRoom',
                                                },
                                            },
                                        },

                                        joiningRoom: {
                                            invoke: {
                                                src:
                                                    (_context, event) =>
                                                    (sendBack) => {
                                                        if (
                                                            event.type !==
                                                            'JOIN_ROOM'
                                                        ) {
                                                            throw new Error(
                                                                'Service must be called in reaction to JOIN_ROOM event',
                                                            );
                                                        }

                                                        socket.emit(
                                                            'MTV_JOIN_ROOM',
                                                            {
                                                                roomID: event.roomID,
                                                            },
                                                        );
                                                    },
                                            },

                                            on: {
                                                // When receiving JOINED_ROOM event,
                                                // connectionToRoom state will go to connected substate.
                                                JOINED_ROOM: {
                                                    target: 'waitingToJoinRoom',

                                                    actions: [
                                                        'assignMergeNewState',
                                                        'goBackFromRef',
                                                        'expandMusicPlayerFullScreen',
                                                    ],
                                                },
                                            },
                                        },
                                    },

                                    on: {
                                        // When receiving JOINED_ROOM event,
                                        // connectionToRoom state will go to connected substate.
                                        JOINED_ROOM: {
                                            target: '.waitingToJoinRoom',

                                            actions: 'assignMergeNewState',
                                        },
                                    },
                                },

                                mpeToMtvExport: {
                                    initial: 'waitingForExport',

                                    states: {
                                        waitingForExport: {
                                            on: {
                                                __ENTER_MPE_EXPORT_TO_MTV: {
                                                    target: 'exporting',
                                                },
                                            },
                                        },

                                        exporting: {
                                            on: {
                                                __EXIT_MPE_EXPORT_TO_MTV: {
                                                    target: 'waitingForExport',
                                                },

                                                // We let `creatingRoom` orthogonal region handle
                                                // assigning received data to context.
                                                ROOM_IS_READY: {
                                                    target: 'waitingForExport',

                                                    actions:
                                                        'expandMusicPlayerFullScreen',
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },

            preserveActionOrder: true,
        },
        {
            actions: {
                assignMergeNewState: assign((context, event) => {
                    if (
                        event.type !== 'JOINED_CREATED_ROOM' &&
                        event.type !== 'JOINED_ROOM' &&
                        event.type !== 'RETRIEVE_CONTEXT' &&
                        event.type !== 'ROOM_IS_READY' &&
                        event.type !== 'PLAY_CALLBACK' &&
                        event.type !== 'PAUSE_CALLBACK' &&
                        event.type !== 'CHANGE_EMITTING_DEVICE_CALLBACK' &&
                        event.type !== 'USER_LENGTH_UPDATE' &&
                        event.type !== 'VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE' &&
                        event.type !== 'VOTE_OR_SUGGEST_TRACK_CALLBACK' &&
                        event.type !== 'USER_PERMISSIONS_UPDATE' &&
                        event.type !== 'TIME_CONSTRAINT_UPDATE' &&
                        event.type !== 'UPDATE_DELEGATION_OWNER_CALLBACK'
                    ) {
                        return context;
                    }
                    console.log(
                        'MERGE ASSIGN FROM event.type = ' + event.type,
                        event.state,
                    );
                    let userRelatedInformationUpdate =
                        context.userRelatedInformation;
                    if (event.state.userRelatedInformation !== null) {
                        userRelatedInformationUpdate =
                            event.state.userRelatedInformation;
                    }

                    return {
                        ...context,
                        ...event.state,
                        progressElapsedTime: event.state.currentTrack?.elapsed,
                        userRelatedInformation: userRelatedInformationUpdate,
                    };
                }),

                assignConstraintsDetails: assign((context, event) => {
                    if (
                        event.type !== 'GET_ROOM_CONSTRAINTS_DETAILS_CALLBACK'
                    ) {
                        return context;
                    }
                    console.log('assignConstraintsDetails');

                    return {
                        ...context,
                        constraintsDetails: {
                            ...event.payload,
                        },
                    };
                }),

                assignRawContext: assign((context) => ({
                    ...context,
                    ...rawContext,
                })),

                assignElapsedTimeToContext: assign((context, event) => {
                    if (event.type !== 'UPDATE_CURRENT_TRACK_ELAPSED_TIME') {
                        return context;
                    }

                    const currentTrack = context.currentTrack;
                    if (!currentTrack)
                        throw new Error('currentTrack is undefined');

                    return {
                        ...context,
                        progressElapsedTime: event.elapsedTime,
                    };
                }),
            },
            guards: {
                roomHasPositionAndTimeConstraints: (context, event) => {
                    return context.hasTimeAndPositionConstraints;
                },
                canVoteForTrack: (context, event) => {
                    if (event.type !== 'VOTE_FOR_TRACK') {
                        return false;
                    }

                    if (context.userRelatedInformation === null) {
                        return false;
                    }

                    if (context.hasTimeAndPositionConstraints) {
                        const userDoesntFitPositionConstraint =
                            context.userRelatedInformation
                                .userFitsPositionConstraint === false;
                        const roomTimeConstraintIsOver =
                            context.timeConstraintIsValid === false;

                        if (
                            roomTimeConstraintIsOver ||
                            userDoesntFitPositionConstraint
                        ) {
                            return false;
                        }
                    }

                    const { trackID } = event;
                    const payloadIsEmpty = trackID === '';
                    if (payloadIsEmpty) {
                        return false;
                    }

                    const userHasVotedForTrack =
                        context.userRelatedInformation.tracksVotedFor.includes(
                            trackID,
                        );
                    const userHasNotVotedForTrack = !userHasVotedForTrack;

                    return userHasNotVotedForTrack;
                },
            },
        },
    );
};
