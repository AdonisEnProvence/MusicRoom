import { ActorRefFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';

const creationMpeRoomFormModel = createModel(
    {
        roomName: '',
        isOpen: false,
    },
    {
        events: {
            SET_ROOM_NAME_AND_GO_NEXT: (args: { roomName: string }) => args,
            SET_OPENING_STATUS: (args: { isOpen: boolean }) => args,
            CONFIRM: () => ({}),
            GO_BACK: () => ({}),
        },
    },
);

const assignRoomNameToContext = creationMpeRoomFormModel.assign(
    {
        roomName: (_, event) => event.roomName,
    },
    'SET_ROOM_NAME_AND_GO_NEXT',
);

const assignOpeningStatusToContext = creationMpeRoomFormModel.assign(
    {
        isOpen: (_, event) => event.isOpen,
    },
    'SET_OPENING_STATUS',
);

export type CreationMpeRoomFormActorRef = ActorRefFrom<
    typeof creationMpeRoomFormMachine
>;

export const creationMpeRoomFormMachine =
    creationMpeRoomFormModel.createMachine({
        id: 'creationMpeRoomForm',

        initial: 'roomName',

        states: {
            roomName: {
                on: {
                    SET_ROOM_NAME_AND_GO_NEXT: {
                        target: 'openingStatus',

                        actions: assignRoomNameToContext,
                    },
                },
            },

            openingStatus: {
                on: {
                    SET_OPENING_STATUS: {
                        target: 'confirmation',

                        actions: assignOpeningStatusToContext,
                    },

                    GO_BACK: {
                        target: 'roomName',
                    },
                },
            },

            confirmation: {
                on: {
                    GO_BACK: {
                        target: 'openingStatus',
                    },

                    CONFIRM: {
                        target: 'confirmed',
                    },
                },
            },

            confirmed: {
                type: 'final',

                data: (context) => context,
            },
        },
    });
