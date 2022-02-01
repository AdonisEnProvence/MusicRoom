import {
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UserProfileInformation,
} from '@musicroom/types';
import { ContextFrom, EventFrom, MachineOptions, StateMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { getFakeUserID } from '../contexts/SocketContext';
import { getUserProfileInformation } from '../services/UsersSearchService';

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

function createProfileInformationMachine({
    fetchUserProfileInformation,
    userID,
}: {
    userID: string;
    fetchUserProfileInformation: (
        body: GetUserProfileInformationRequestBody,
    ) => Promise<GetUserProfileInformationResponseBody>;
}) {
    const userProfileInformationMachine =
        userProfileInformationModel.createMachine(
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
        );

    return userProfileInformationMachine;
}

export type ProfileInformationMachineContext = ContextFrom<
    typeof userProfileInformationModel
>;
export type ProfileInformationMachineEvents = EventFrom<
    typeof userProfileInformationModel
>;

export type ProfileInformationMachineOptions = Partial<
    MachineOptions<
        ProfileInformationMachineContext,
        ProfileInformationMachineEvents
    >
>;

export function createUserProfileInformationMachine({
    userID,
    config,
}: {
    userID: string;
    config: ProfileInformationMachineOptions;
}): StateMachine<
    ProfileInformationMachineContext,
    any,
    ProfileInformationMachineEvents
> {
    return createProfileInformationMachine({
        userID,
        //could I be using with config the forward fetchUserProfileInformation ?
        fetchUserProfileInformation: async ({
            tmpAuthUserID,
            userID: givenUserID,
        }: GetUserProfileInformationRequestBody) => {
            return await getUserProfileInformation({
                tmpAuthUserID,
                userID: givenUserID,
            });
        },
    }).withConfig(config);
}
