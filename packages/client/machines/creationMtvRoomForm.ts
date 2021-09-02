import {
    StateMachine,
    EventFrom,
    ContextFrom,
    StateFrom,
    sendParent,
    ActorRef,
} from 'xstate';
import { createModel } from 'xstate/lib/model';
import { navigateFromRef } from '../navigation/RootNavigation';
import { CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents } from './appMusicPlayerMachine';

const creationMtvRoomFormModel = createModel(
    {
        roomName: '',
        isOpen: false,
        onlyInvitedUsersCanVote: false,
    },
    {
        events: {
            SET_ROOM_NAME: (roomName: string) => ({ roomName }),

            SET_OPENING_STATUS: (isOpen: boolean) => ({ isOpen }),

            SET_INVITED_USERS_VOTE_RESTRICTION: (
                onlyInvitedUsersCanVote: boolean,
            ) => ({ onlyInvitedUsersCanVote }),

            FORWARD_MODAL_CLOSER: (closeModal: () => void) => ({ closeModal }),

            GO_BACK: () => ({}),

            NEXT: () => ({}),
        },
    },
);

type CreationMtvRoomFormModelEventsCreators =
    typeof creationMtvRoomFormModel.events;
type ForwardModalCloserEvent = ReturnType<
    CreationMtvRoomFormModelEventsCreators['FORWARD_MODAL_CLOSER']
>;

export type CreationMtvRoomFormMachineContext = ContextFrom<
    typeof creationMtvRoomFormModel
>;

export type CreationMtvRoomFormMachineEvent = EventFrom<
    typeof creationMtvRoomFormModel
>;

export type CreationMtvRoomFormMachine = StateMachine<
    CreationMtvRoomFormMachineContext,
    any,
    CreationMtvRoomFormMachineEvent
>;

export type CreationMtvRoomFormMachineState =
    StateFrom<CreationMtvRoomFormMachine>;

export type CreationMtvRoomFormActorRef = ActorRef<
    CreationMtvRoomFormMachineEvent,
    CreationMtvRoomFormMachineState
>;

const assignRoomName = creationMtvRoomFormModel.assign(
    {
        roomName: (_context, { roomName }) => roomName,
    },
    'SET_ROOM_NAME',
);

const assignIsOpen = creationMtvRoomFormModel.assign(
    {
        isOpen: (_context, { isOpen }) => isOpen,
    },
    'SET_OPENING_STATUS',
);

const resetOnlyInvitedUsersCanVote = creationMtvRoomFormModel.assign(
    {
        onlyInvitedUsersCanVote: false,
    },
    undefined,
);

export function createCreationMtvRoomFormMachine(): CreationMtvRoomFormMachine {
    return creationMtvRoomFormModel.createMachine({
        context: creationMtvRoomFormModel.initialContext,

        initial: 'roomName',

        states: {
            roomName: {
                entry: () => {
                    try {
                        navigateFromRef('MusicTrackVoteCreationFormName');
                    } catch {
                        // An error is thrown when the modal is open.
                        // We are not yet in MusicTrackVoteCreationForm and
                        // we can there is no screen called MusicTrackVoteCreationFormName.
                        // This is not a problem that the first call does not succeed
                        // as we already perform the redirection in openCreationMtvRoomFormModal action.
                        // It is particularly useful to handle redirection to Name step.
                    }
                },

                on: {
                    SET_ROOM_NAME: {
                        actions: assignRoomName,
                    },

                    FORWARD_MODAL_CLOSER: {
                        actions: sendParent<
                            CreationMtvRoomFormMachineContext,
                            ForwardModalCloserEvent,
                            CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents
                        >((_context, event) => ({
                            type: 'SAVE_MTV_ROOM_CREATION_MODAL_CLOSER',
                            closeModal: event.closeModal,
                        })),
                    },

                    GO_BACK: {
                        actions: sendParent<
                            CreationMtvRoomFormMachineContext,
                            any,
                            CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents
                        >({
                            type: 'EXIT_MTV_ROOM_CREATION',
                        }),
                    },

                    NEXT: {
                        target: 'openingStatus',
                    },
                },
            },

            openingStatus: {
                entry: () => {
                    navigateFromRef('MusicTrackVoteCreationFormOpeningStatus');
                },

                initial: 'public',

                states: {
                    public: {
                        tags: 'isRoomPublic',

                        entry: resetOnlyInvitedUsersCanVote,

                        on: {
                            SET_INVITED_USERS_VOTE_RESTRICTION: {
                                actions: creationMtvRoomFormModel.assign({
                                    onlyInvitedUsersCanVote: (
                                        _context,
                                        { onlyInvitedUsersCanVote },
                                    ) => onlyInvitedUsersCanVote,
                                }),
                            },
                        },
                    },

                    private: {
                        tags: 'isRoomPrivate',
                    },
                },

                on: {
                    SET_OPENING_STATUS: [
                        {
                            cond: (_context, { isOpen }) => isOpen === true,

                            target: '.public',

                            actions: assignIsOpen,
                        },

                        {
                            target: '.private',

                            actions: assignIsOpen,
                        },
                    ],

                    GO_BACK: {
                        target: 'roomName',
                    },

                    NEXT: {
                        target: 'physicalConstraints',
                    },
                },
            },

            physicalConstraints: {
                entry: () => {
                    navigateFromRef(
                        'MusicTrackVoteCreationFormPhysicalConstraints',
                    );
                },

                on: {
                    GO_BACK: {
                        target: 'openingStatus',
                    },
                },
            },

            playingMode: {
                entry: () => {
                    navigateFromRef('MusicTrackVoteCreationFormPlayingMode');
                },

                on: {
                    GO_BACK: {
                        target: 'physicalConstraints',
                    },
                },
            },

            votesConstraints: {
                entry: () => {
                    navigateFromRef(
                        'MusicTrackVoteCreationFormVotesConstraints',
                    );
                },

                on: {
                    GO_BACK: {
                        target: 'playingMode',
                    },
                },
            },

            confirmation: {
                entry: () => {
                    navigateFromRef('MusicTrackVoteCreationFormConfirmation');
                },

                on: {
                    GO_BACK: {
                        target: 'votesConstraints',
                    },
                },

                type: 'final',
            },
        },
    });
}
