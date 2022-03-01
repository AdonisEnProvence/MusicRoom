import { MyProfileInformation } from '@musicroom/types';
import { ContextFrom, EventFrom, MachineOptions, StateMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { getMyProfileInformationMachineOptions } from './options/myProfileInformationMachineOptions copy';

const myProfileInformationModel = createModel(
    {
        myProfileInformation: undefined as undefined | MyProfileInformation,
    },
    {
        events: {
            RETRIEVE_MY_PROFILE_INFORMATION_SUCCESS: (
                myProfileInformation: MyProfileInformation,
            ) => ({ myProfileInformation }),
            RETRIEVE_MY_PROFILE_INFORMATION_FAILURE: () => ({}),
        },
        actions: {
            triggerFailureRetrieveMyProfileInformationToast: () => ({}),
        },
    },
);

const assignUserMyProfileInformation = myProfileInformationModel.assign(
    {
        myProfileInformation: (_context, { myProfileInformation }) => {
            return myProfileInformation;
        },
    },
    'RETRIEVE_MY_PROFILE_INFORMATION_SUCCESS',
);

export type MyProfileInformationMachineContext = ContextFrom<
    typeof myProfileInformationModel
>;
export type MyProfileInformationMachineEvents = EventFrom<
    typeof myProfileInformationModel
>;

export type MyProfileInformationMachineOptions = Partial<
    MachineOptions<
        MyProfileInformationMachineContext,
        MyProfileInformationMachineEvents
    >
>;

export function createMyProfileInformationMachine(): StateMachine<
    MyProfileInformationMachineContext,
    any,
    MyProfileInformationMachineEvents
> {
    return myProfileInformationModel
        .createMachine({
            context: {
                myProfileInformation: undefined,
            },
            initial: 'idle',
            states: {
                idle: {},

                userNotFound: {
                    tags: 'userNotFound',
                },

                userFound: {},
            },
            on: {
                RETRIEVE_MY_PROFILE_INFORMATION_SUCCESS: {
                    target: 'userFound',
                    actions: [assignUserMyProfileInformation, 'updateCache'],
                },

                RETRIEVE_MY_PROFILE_INFORMATION_FAILURE: {
                    target: 'userNotFound',
                    actions:
                        myProfileInformationModel.actions.triggerFailureRetrieveMyProfileInformationToast(),
                },
            },
        })
        .withConfig(getMyProfileInformationMachineOptions());
}
