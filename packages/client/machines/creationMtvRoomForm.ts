import { StateMachine, EventFrom, ContextFrom, StateFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';

const creationMtvRoomFormModel = createModel(
    {
        a: 'lol',
    },
    {
        events: {
            LOL: () => ({}),

            TEST: () => ({ a: 'lol' }),
        },
    },
);

export type CreationMtvRoomFormMachine = StateMachine<
    ContextFrom<typeof creationMtvRoomFormModel>,
    any,
    EventFrom<typeof creationMtvRoomFormModel>
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
            roomName: {},

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
