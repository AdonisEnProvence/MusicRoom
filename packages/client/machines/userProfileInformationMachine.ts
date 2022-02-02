import {
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UserProfileInformation,
} from '@musicroom/types';
import { ContextFrom, EventFrom, MachineOptions, StateMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { getFakeUserID } from '../contexts/SocketContext';
import { getUserProfileInformation } from '../services/UsersSearchService';
import { getUserProfileInformationMachineOptions } from './options/userProfileInformationMachineOptions';

const userProfileInformationModel = createModel(
    {
        userProfileInformation: undefined as undefined | UserProfileInformation,
    },
    {
        events: {
            __RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS: (
                userProfileInformation: UserProfileInformation,
            ) => ({ userProfileInformation }),
            __RETRIEVE_USER_PROFILE_INFORMATION_FAILURE: () => ({}),
        },
        actions: {
            triggerFailurRetrieveProfileUserInformationToast: () => ({}),
        },
    },
);

const assignUserProfileInformation = userProfileInformationModel.assign(
    {
        userProfileInformation: (_context, { userProfileInformation }) =>
            userProfileInformation,
    },
    '__RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS',
);

export type UserProfileInformationMachineContext = ContextFrom<
    typeof userProfileInformationModel
>;
export type UserProfileInformationMachineEvents = EventFrom<
    typeof userProfileInformationModel
>;

export type UserProfileInformationMachineOptions = Partial<
    MachineOptions<
        UserProfileInformationMachineContext,
        UserProfileInformationMachineEvents
    >
>;

export function createUserProfileInformationMachine({
    userID,
}: {
    userID: string;
}): StateMachine<
    UserProfileInformationMachineContext,
    any,
    UserProfileInformationMachineEvents
> {
    async function fetchUserProfileInformation({
        tmpAuthUserID,
        userID: givenUserID,
    }: GetUserProfileInformationRequestBody): Promise<GetUserProfileInformationResponseBody> {
        return await getUserProfileInformation({
            tmpAuthUserID,
            userID: givenUserID,
        });
    }
    const config = getUserProfileInformationMachineOptions();

    const userProfileInformationMachine = userProfileInformationModel
        .createMachine(
            {
                context: {
                    userProfileInformation: undefined,
                },
                initial: 'retrieveUserProfileInformation',
                states: {
                    retrieveUserProfileInformation: {
                        invoke: {
                            src: 'retrieveUserProfileInformation',
                        },

                        on: {
                            __RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS: {
                                actions: assignUserProfileInformation,
                                target: 'userFound',
                            },

                            __RETRIEVE_USER_PROFILE_INFORMATION_FAILURE: {
                                target: 'userNotFound',
                                actions:
                                    userProfileInformationModel.actions.triggerFailurRetrieveProfileUserInformationToast(),
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
                    retrieveUserProfileInformation: () => async (sendBack) => {
                        try {
                            const response = await fetchUserProfileInformation({
                                userID,
                                tmpAuthUserID: getFakeUserID(),
                            });

                            sendBack({
                                type: '__RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS',
                                userProfileInformation: response,
                            });
                        } catch (e) {
                            console.log('error occured');
                            sendBack({
                                type: '__RETRIEVE_USER_PROFILE_INFORMATION_FAILURE',
                            });
                        }
                    },
                },
            },
        )
        .withConfig(config);

    return userProfileInformationMachine;
}
