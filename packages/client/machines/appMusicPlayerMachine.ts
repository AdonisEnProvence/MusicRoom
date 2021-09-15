import {
    MtvRoomClientToServerCreateArgs,
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import {
    assign,
    createMachine,
    forwardTo,
    Receiver,
    send,
    Sender,
    State,
    StateMachine,
} from 'xstate';
import { SocketClient } from '../hooks/useSocket';
import {
    createCreationMtvRoomFormMachine,
    CreationMtvRoomFormDoneInvokeEvent,
    creationMtvRoomFormInitialContext,
    CreationMtvRoomFormMachineContext,
} from './creationMtvRoomForm';

export interface AppMusicPlayerMachineContext extends MtvWorkflowState {
    waitingRoomID?: string;
    progressElapsedTime: number;

    initialTracksIDs?: string[];
    closeSuggestionModal?: () => void;
    closeMtvRoomCreationModal?: () => void;
}

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
    | { type: 'MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET' }
    | { type: 'TRACK_HAS_LOADED' }
    | {
          type: 'UPDATE_CURRENT_TRACK_ELAPSED_TIME';
          elapsedTime: number;
      }
    | {
          type: 'PLAY_PAUSE_TOGGLE';
          params: { status: 'play' | 'pause' };
      }
    | { type: 'GO_TO_NEXT_TRACK' }
    | { type: 'CHANGE_EMITTING_DEVICE'; deviceID: string }
    | { type: 'PLAY_CALLBACK'; state: MtvWorkflowState }
    | { type: 'FORCED_DISCONNECTION' }
    | { type: 'LEAVE_ROOM' }
    | { type: 'USER_LENGTH_UPDATE'; state: MtvWorkflowState }
    | { type: 'FOCUS_READY' }
    | { type: 'CHANGE_EMITTING_DEVICE_CALLBACK'; state: MtvWorkflowState }
    | {
          type: 'RETRIEVE_CONTEXT';
          state: MtvWorkflowState;
      }
    | { type: 'PAUSE_CALLBACK' }
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
    | CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents;

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
    waitingRoomID: undefined,
    progressElapsedTime: 0,
    initialTracksIDs: undefined,
    closeSuggestionModal: undefined,
    minimumScoreToBePlayed: 1,
};

export const createAppMusicPlayerMachine = ({
    socket,
}: CreateAppMusicPlayerMachineArgs): StateMachine<
    AppMusicPlayerMachineContext,
    any,
    AppMusicPlayerMachineEvent
> => {
    const creationMtvRoomForm = createCreationMtvRoomFormMachine();

    return createMachine<
        AppMusicPlayerMachineContext,
        AppMusicPlayerMachineEvent
    >(
        {
            invoke: {
                id: 'socketConnection',
                src:
                    (_context, _event) =>
                    (
                        sendBack: Sender<AppMusicPlayerMachineEvent>,
                        onReceive: Receiver<AppMusicPlayerMachineEvent>,
                    ) => {
                        socket.on('RETRIEVE_CONTEXT', (state) => {
                            sendBack({
                                type: 'RETRIEVE_CONTEXT',
                                state,
                            });
                        });

                        socket.on('USER_LENGTH_UPDATE', (state) => {
                            console.log('USER_LENGTH_UPDATE');
                            sendBack({
                                type: 'USER_LENGTH_UPDATE',
                                state,
                            });
                        });

                        socket.on('CREATE_ROOM_SYNCHED_CALLBACK', (state) => {
                            sendBack({
                                type: 'JOINED_CREATED_ROOM',
                                state,
                            });
                        });

                        socket.on(
                            'CHANGE_EMITTING_DEVICE_CALLBACK',
                            (state) => {
                                sendBack({
                                    type: 'CHANGE_EMITTING_DEVICE_CALLBACK',
                                    state,
                                });
                            },
                        );

                        socket.on('CREATE_ROOM_CALLBACK', (state) => {
                            sendBack({
                                type: 'ROOM_IS_READY',
                                state,
                            });
                        });

                        socket.on('JOIN_ROOM_CALLBACK', (state) => {
                            sendBack({
                                type: 'JOINED_ROOM',
                                state,
                            });
                        });

                        socket.on('ACTION_PLAY_CALLBACK', (state) => {
                            sendBack({
                                type: 'PLAY_CALLBACK',
                                state,
                            });
                        });

                        socket.on('ACTION_PAUSE_CALLBACK', () => {
                            sendBack({
                                type: 'PAUSE_CALLBACK',
                            });
                        });

                        socket.on(
                            'VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
                            (state) => {
                                sendBack({
                                    type: 'VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE',
                                    state,
                                });
                            },
                        );

                        socket.on('VOTE_OR_SUGGEST_TRACK_CALLBACK', (state) => {
                            console.log(
                                'RECEIVED VOTE FOR TRACK CALLBACK',
                                state,
                            );
                            sendBack({
                                type: 'VOTE_OR_SUGGEST_TRACK_CALLBACK',
                                state,
                            });
                        });

                        socket.on('SUGGEST_TRACKS_CALLBACK', () => {
                            sendBack({
                                type: 'SUGGEST_TRACKS_CALLBACK',
                            });
                        });

                        socket.on('SUGGEST_TRACKS_FAIL_CALLBACK', () => {
                            sendBack({
                                type: 'SUGGEST_TRACKS_FAIL_CALLBACK',
                            });
                        });

                        socket.on('FORCED_DISCONNECTION', () => {
                            sendBack({
                                type: 'FORCED_DISCONNECTION',
                            });
                        });

                        onReceive((e) => {
                            switch (e.type) {
                                case 'PLAY_PAUSE_TOGGLE': {
                                    const { status } = e.params;

                                    if (status === 'play') {
                                        socket.emit('ACTION_PAUSE');
                                    } else {
                                        socket.emit('ACTION_PLAY');
                                    }

                                    break;
                                }

                                case 'GO_TO_NEXT_TRACK': {
                                    socket.emit('GO_TO_NEXT_TRACK');

                                    break;
                                }

                                case 'LEAVE_ROOM': {
                                    socket.emit('LEAVE_ROOM');

                                    break;
                                }

                                case 'CHANGE_EMITTING_DEVICE': {
                                    socket.emit('CHANGE_EMITTING_DEVICE', {
                                        newEmittingDeviceID: e.deviceID,
                                    });

                                    break;
                                }

                                case 'SUGGEST_TRACKS': {
                                    const tracksToSuggest = e.tracksToSuggest;

                                    socket.emit('SUGGEST_TRACKS', {
                                        tracksToSuggest,
                                    });

                                    break;
                                }

                                case 'VOTE_FOR_TRACK': {
                                    socket.emit('VOTE_FOR_TRACK', {
                                        trackID: e.trackID,
                                    });

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
                    initial: 'waitingForJoinOrCreateRoom',

                    states: {
                        waitingForJoinOrCreateRoom: {
                            entry: 'assignRawContext',

                            invoke: {
                                src: (_context) => () => {
                                    /**
                                     * Looking for other sessions context
                                     * e.g already joined room etc etc
                                     */
                                    socket.emit('GET_CONTEXT');
                                },
                            },
                        },

                        creatingRoom: {
                            initial: 'selectingRoomOptions',

                            states: {
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
                                            if (event.type !== 'CREATE_ROOM') {
                                                throw new Error(
                                                    'Invalid event',
                                                );
                                            }

                                            if (
                                                initialTracksIDs === undefined
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
                                        SAVE_MTV_ROOM_CREATION_MODAL_CLOSER: {
                                            actions: assign({
                                                closeMtvRoomCreationModal: (
                                                    _context,
                                                    event,
                                                ) => event.closeModal,
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
                                                initialTracksIDs === undefined
                                            ) {
                                                return;
                                            }

                                            const {
                                                data: {
                                                    roomName,
                                                    isOpen,
                                                    onlyInvitedUsersCanVote,
                                                    hasPhysicalConstraints,
                                                    physicalConstraintPlace,
                                                    physicalConstraintRadius,
                                                    physicalConstraintStartsAt,
                                                    physicalConstraintEndsAt,
                                                    playingMode,
                                                    minimumVotesForATrackToBePlayed,
                                                },
                                            } = creationMtvRoomFormDoneInvokeEvent;
                                            const payload: MtvRoomClientToServerCreateArgs =
                                                {
                                                    name: roomName,
                                                    initialTracksIDs:
                                                        initialTracksIDs,
                                                    hasPhysicalAndTimeConstraints:
                                                        hasPhysicalConstraints,
                                                    isOpen,
                                                    isOpenOnlyInvitedUsersCanVote:
                                                        onlyInvitedUsersCanVote,
                                                    minimumScoreToBePlayed:
                                                        minimumVotesForATrackToBePlayed,
                                                    physicalAndTimeConstraints:
                                                        hasPhysicalConstraints ===
                                                        true
                                                            ? {
                                                                  physicalConstraintPlace,
                                                                  physicalConstraintRadius,
                                                                  physicalConstraintStartsAt:
                                                                      physicalConstraintStartsAt.toISOString(),
                                                                  physicalConstraintEndsAt:
                                                                      physicalConstraintEndsAt.toISOString(),
                                                              }
                                                            : undefined,
                                                };

                                            socket.emit('CREATE_ROOM', payload);
                                        },
                                    },

                                    on: {
                                        JOINED_CREATED_ROOM: {
                                            target: 'roomIsNotReady',
                                            actions: 'assignMergeNewState',
                                        },
                                    },
                                },

                                roomIsNotReady: {
                                    on: {
                                        ROOM_IS_READY: {
                                            target: 'roomIsReady',
                                            actions: 'assignMergeNewState',
                                        },
                                    },
                                },

                                roomIsReady: {
                                    type: 'final',
                                },
                            },

                            on: {
                                EXIT_MTV_ROOM_CREATION: {
                                    target: 'waitingForJoinOrCreateRoom',
                                },
                            },

                            onDone: {
                                target: 'connectedToRoom',
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

                                    socket.emit('JOIN_ROOM', {
                                        roomID: event.roomID,
                                    });
                                },
                            },

                            on: {
                                JOINED_ROOM: {
                                    target: 'connectedToRoom',

                                    cond: (context, event) => {
                                        return (
                                            event.state.roomID ===
                                            context.waitingRoomID
                                        );
                                    },

                                    actions: 'assignMergeNewState',
                                },
                            },
                        },

                        connectedToRoom: {
                            type: 'parallel',

                            tags: 'roomIsReady',

                            states: {
                                playerState: {
                                    initial: 'waitingForPlayerToBeSet',

                                    states: {
                                        waitingForPlayerToBeSet: {
                                            on: {
                                                MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET:
                                                    {
                                                        target: 'waitingForTrackToLoad',
                                                    },
                                            },
                                        },

                                        waitingForTrackToLoad: {
                                            on: {
                                                TRACK_HAS_LOADED: {
                                                    target: 'loadingTrackDuration',
                                                },
                                            },
                                        },

                                        loadingTrackDuration: {
                                            always: [
                                                {
                                                    cond: ({ playing }) =>
                                                        playing === true,
                                                    target: 'activatedPlayer.play',
                                                },

                                                {
                                                    target: 'activatedPlayer.pause',
                                                },
                                            ],
                                        },

                                        activatedPlayer: {
                                            initial: 'pause',

                                            states: {
                                                pause: {
                                                    tags: 'playerOnPause',

                                                    initial: 'idle',

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
                                                                    (
                                                                        context,
                                                                        _event,
                                                                    ) => ({
                                                                        type: 'PLAY_PAUSE_TOGGLE',
                                                                        params: {
                                                                            status: 'pause',
                                                                        },
                                                                    }),
                                                                    {
                                                                        to: 'socketConnection',
                                                                    },
                                                                ),
                                                            },
                                                    },
                                                },

                                                play: {
                                                    tags: 'playerOnPlay',

                                                    invoke: {
                                                        src: 'pollTrackElapsedTime',
                                                    },

                                                    initial: 'idle',

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
                                                                    (
                                                                        _context,
                                                                        _event,
                                                                    ) => ({
                                                                        type: 'PLAY_PAUSE_TOGGLE',
                                                                        params: {
                                                                            status: 'play',
                                                                        },
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
                                                PAUSE_CALLBACK: {
                                                    target: 'activatedPlayer.pause',
                                                },

                                                PLAY_CALLBACK: [
                                                    {
                                                        target: 'waitingForTrackToLoad',

                                                        cond: (
                                                            { currentTrack },
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

                                                GO_TO_NEXT_TRACK: {
                                                    actions:
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                },
                                            },
                                        },
                                    },
                                },

                                tracksSuggestion: {
                                    initial: 'waitingForTracksToBeSuggested',

                                    states: {
                                        waitingForTracksToBeSuggested: {
                                            on: {
                                                SUGGEST_TRACKS: {
                                                    target: 'waitingForTracksSuggestionToBeAcknowledged',

                                                    actions: [
                                                        assign({
                                                            closeSuggestionModal:
                                                                (
                                                                    _context,
                                                                    {
                                                                        closeSuggestionModal,
                                                                    },
                                                                ) =>
                                                                    closeSuggestionModal,
                                                        }),

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
                                                    SUGGEST_TRACKS_CALLBACK: {
                                                        target: 'waitingForTracksToBeSuggested',

                                                        actions: [
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

                                                            actions: [
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
                                        VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE: {
                                            actions: 'assignMergeNewState',
                                        },
                                    },
                                },
                            },

                            on: {
                                FORCED_DISCONNECTION: {
                                    target: 'waitingForJoinOrCreateRoom',
                                    actions: [
                                        'assignRawContext',
                                        'displayAlertForcedDisconnection',
                                    ],
                                },

                                LEAVE_ROOM: {
                                    target: 'waitingForJoinOrCreateRoom',
                                    actions: [
                                        'assignRawContext',
                                        send(
                                            (_context) => ({
                                                type: 'LEAVE_ROOM',
                                            }),
                                            {
                                                to: 'socketConnection',
                                            },
                                        ),
                                        'leaveRoomFromLeaveRoomButton',
                                    ],
                                },

                                CHANGE_EMITTING_DEVICE: {
                                    cond: (
                                        { userRelatedInformation },
                                        { deviceID },
                                    ) => {
                                        if (userRelatedInformation !== null) {
                                            const pickedDeviceIsNotEmitting =
                                                userRelatedInformation.emittingDeviceID !==
                                                deviceID;

                                            return pickedDeviceIsNotEmitting;
                                        }
                                        return false;
                                    },

                                    actions: forwardTo('socketConnection'),
                                },

                                CHANGE_EMITTING_DEVICE_CALLBACK: {
                                    cond: ({ userRelatedInformation }) => {
                                        const userRelatedInformationIsNotNull =
                                            userRelatedInformation !== null;

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
                                    actions: forwardTo('socketConnection'),
                                },

                                VOTE_OR_SUGGEST_TRACK_CALLBACK: {
                                    actions: 'assignMergeNewState',
                                },

                                USER_LENGTH_UPDATE: {
                                    actions: 'assignMergeNewState',
                                },
                            },
                        },
                    },

                    on: {
                        JOIN_ROOM: {
                            target: '.joiningRoom',

                            actions: assign((context, event) => {
                                if (event.type !== 'JOIN_ROOM') {
                                    return context;
                                }

                                return {
                                    ...rawContext,
                                    waitingRoomID: event.roomID,
                                };
                            }),
                        },

                        CREATE_ROOM: {
                            target: '.creatingRoom',

                            actions: assign((context, event) => ({
                                ...context,
                                ...rawContext,
                                initialTracksIDs: event.initialTracksIDs,
                            })),
                        },

                        RETRIEVE_CONTEXT: {
                            target: '.connectedToRoom',

                            actions: 'assignMergeNewState',
                        },

                        JOINED_CREATED_ROOM: {
                            target: '.creatingRoom.roomIsNotReady',

                            actions: 'assignMergeNewState',
                        },

                        ROOM_IS_READY: {
                            target: '.creatingRoom.roomIsReady',

                            actions: 'assignMergeNewState',
                        },
                    },
                },
            },
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
                        event.type !== 'CHANGE_EMITTING_DEVICE_CALLBACK' &&
                        event.type !== 'USER_LENGTH_UPDATE' &&
                        event.type !== 'VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE' &&
                        event.type !== 'VOTE_OR_SUGGEST_TRACK_CALLBACK'
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
                canVoteForTrack: (context, event) => {
                    if (event.type !== 'VOTE_FOR_TRACK') {
                        return false;
                    }

                    if (context.userRelatedInformation === null) {
                        return false;
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
