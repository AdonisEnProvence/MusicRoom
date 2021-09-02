import {
    StateMachine,
    EventFrom,
    ContextFrom,
    StateFrom,
    sendParent,
} from 'xstate';
import { createModel } from 'xstate/lib/model';
import { navigateFromRef } from '../navigation/RootNavigation';
import { CreationMtvRoomFormMachineToAppMusicPlayerMachineEvents } from './appMusicPlayerMachine';

const creationMtvRoomFormModel = createModel(
    {
        roomName: '',
    },
    {
        events: {
            FORWARD_MODAL_CLOSER: (closeModal: () => void) => ({ closeModal }),

            GO_BACK: () => ({}),

            SAVE_ROOM_NAME: (roomName: string) => ({ roomName }),
        },
    },
);

type CreationMtvRoomFormModelEventsCreators =
    typeof creationMtvRoomFormModel.events;
type ForwardModalCloserEvent = ReturnType<
    CreationMtvRoomFormModelEventsCreators['FORWARD_MODAL_CLOSER']
>;

export type CreationMtvRoomFormMachine = StateMachine<
    ContextFrom<typeof creationMtvRoomFormModel>,
    any,
    EventFrom<typeof creationMtvRoomFormModel>
>;
type CreationMtvRoomFormMachineContext = ContextFrom<
    typeof creationMtvRoomFormModel
>;
export type CreationMtvRoomFormMachineState =
    StateFrom<CreationMtvRoomFormMachine>;
export type CreationMtvRoomFormMachineEvent =
    EventFrom<CreationMtvRoomFormMachine>;

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
                        // An error is thrown when the modal is opened.
                        // We are not yet in MusicTrackVoteCreationForm and
                        // we can there is no screen called MusicTrackVoteCreationFormName.
                        // This is not a problem that the first call does not succeed
                        // as we already perform the redirection in openCreationMtvRoomFormModal action.
                        // It is particularly useful to handle redirection to Name step.
                    }
                },

                on: {
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

                    SAVE_ROOM_NAME: {
                        target: 'openingStatus',

                        actions: creationMtvRoomFormModel.assign({
                            roomName: (_context, { roomName }) => roomName,
                        }),
                    },
                },
            },

            openingStatus: {
                entry: () => {
                    navigateFromRef('MusicTrackVoteCreationFormOpeningStatus');
                },

                on: {
                    GO_BACK: {
                        target: 'roomName',
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
