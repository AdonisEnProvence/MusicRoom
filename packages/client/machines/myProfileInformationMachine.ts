import {
    GetMyProfileInformationRequestBody,
    GetMyProfileInformationResponseBody,
    MyProfileInformation,
} from '@musicroom/types';
import { ContextFrom, EventFrom, MachineOptions, StateMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { getFakeUserID } from '../contexts/SocketContext';
import { getMyProfileInformation } from '../services/UsersSearchService';
import { getMyProfileInformationMachineOptions } from './options/myProfileInformationMachineOptions copy';

const myProfileInformationModel = createModel(
    {
        myProfileInformation: undefined as undefined | MyProfileInformation,
    },
    {
        events: {
            __RETRIEVE_MY_PROFILE_INFORMATION_SUCCESS: (
                myProfileInformation: MyProfileInformation,
            ) => ({ myProfileInformation }),
            __RETRIEVE_MY_PROFILE_INFORMATION_FAILURE: () => ({}),
        },
        actions: {
            triggerFailureRetrieveMyProfileInformationToast: () => ({}),
        },
    },
);

const assignUserMyProfileInformation = myProfileInformationModel.assign(
    {
        myProfileInformation: (_context, { myProfileInformation }) =>
            myProfileInformation,
    },
    '__RETRIEVE_MY_PROFILE_INFORMATION_SUCCESS',
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
        .createMachine(
            {
                context: {
                    myProfileInformation: undefined,
                },
                initial: 'retrieveMyProfileInformation',
                states: {
                    retrieveMyProfileInformation: {
                        invoke: {
                            src: 'retrieveMyProfileInformation',
                        },

                        on: {
                            __RETRIEVE_MY_PROFILE_INFORMATION_SUCCESS: {
                                actions: assignUserMyProfileInformation,
                                target: 'userFound',
                            },

                            __RETRIEVE_MY_PROFILE_INFORMATION_FAILURE: {
                                target: 'userNotFound',
                                actions:
                                    myProfileInformationModel.actions.triggerFailureRetrieveMyProfileInformationToast(),
                            },
                        },
                    },

                    userNotFound: {
                        tags: 'userNotFound',
                    },

                    userFound: {},
                },
            },
            {
                services: {
                    retrieveMyProfileInformation: () => async (sendBack) => {
                        try {
                            const response = await getMyProfileInformation({
                                tmpAuthUserID: getFakeUserID(),
                            });

                            sendBack({
                                type: '__RETRIEVE_MY_PROFILE_INFORMATION_SUCCESS',
                                myProfileInformation: response,
                            });
                        } catch (e) {
                            console.log('error occured');
                            sendBack({
                                type: '__RETRIEVE_MY_PROFILE_INFORMATION_FAILURE',
                            });
                        }
                    },
                },
            },
        )
        .withConfig(getMyProfileInformationMachineOptions());
}
