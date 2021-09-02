import {
    StateMachine,
    EventFrom,
    ContextFrom,
    StateFrom,
    sendParent,
} from 'xstate';
import { createModel } from 'xstate/lib/model';
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

            openingStatus: {},

            physicalConstraints: {},

            playingMode: {},

            votesConstraints: {},

            confirmation: {
                type: 'final',
            },
        },
    });
}
