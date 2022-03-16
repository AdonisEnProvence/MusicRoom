import { UserProfileInformation } from '@musicroom/types';
import { ContextFrom, EventFrom, MachineOptions, StateMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import {
    getUserProfileInformation,
    sendFollowUser,
    sendUnfollowUser,
} from '../services/UserProfileService';
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
            FOLLOW_USER: () => ({}),
            __FOLLOW_USER_SUCCESS: (
                userProfileInformation: UserProfileInformation,
            ) => ({ userProfileInformation }),
            __FOLLOW_USER_FAILURE: () => ({}),
            UNFOLLOW_USER: () => ({}),
            __UNFOLLOW_USER_SUCCESS: (
                userProfileInformation: UserProfileInformation,
            ) => ({ userProfileInformation }),
            __UNFOLLOW_USER_FAILURE: () => ({}),
        },
        actions: {
            displayFailureRetrieveProfileUserErrorToast: () => ({}),
            displayFailureFollowOrUnfollowUserErrorToast: () => ({}),
        },
    },
);

const assignFetchedUserProfileInformation = userProfileInformationModel.assign(
    {
        userProfileInformation: (_context, { userProfileInformation }) =>
            userProfileInformation,
    },
    '__RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS',
);

const assignUnfollowedUserProfileInformation =
    userProfileInformationModel.assign(
        {
            userProfileInformation: (_context, { userProfileInformation }) =>
                userProfileInformation,
        },
        '__UNFOLLOW_USER_SUCCESS',
    );

const assignFollowedUserProfileInformation = userProfileInformationModel.assign(
    {
        userProfileInformation: (_context, { userProfileInformation }) =>
            userProfileInformation,
    },
    '__FOLLOW_USER_SUCCESS',
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
    return userProfileInformationModel
        .createMachine(
            {
                context: {
                    userProfileInformation: undefined,
                },
                initial: 'retrieveUserProfileInformation',
                states: {
                    retrieveUserProfileInformation: {
                        tags: 'loading',

                        invoke: {
                            src: 'retrieveUserProfileInformation',
                        },

                        on: {
                            __RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS: [
                                {
                                    cond: (
                                        _context,
                                        {
                                            userProfileInformation: {
                                                following,
                                            },
                                        },
                                    ) => following,
                                    actions:
                                        assignFetchedUserProfileInformation,
                                    target: 'userFound.currentlyFollowingUser',
                                },
                                {
                                    actions:
                                        assignFetchedUserProfileInformation,
                                    target: 'userFound.currentlyNotFollowingUser',
                                },
                            ],

                            __RETRIEVE_USER_PROFILE_INFORMATION_FAILURE: {
                                target: 'userNotFound',
                                actions:
                                    userProfileInformationModel.actions.displayFailureRetrieveProfileUserErrorToast(),
                            },
                        },
                    },

                    userNotFound: {
                        tags: 'userNotFound',
                    },

                    userFound: {
                        states: {
                            currentlyFollowingUser: {
                                on: {
                                    UNFOLLOW_USER: {
                                        target: 'sendingUnfollowUser',
                                    },
                                },
                            },

                            currentlyNotFollowingUser: {
                                on: {
                                    FOLLOW_USER: {
                                        target: 'sendingFollowUser',
                                    },
                                },
                            },

                            sendingFollowUser: {
                                tags: 'loading',

                                invoke: {
                                    src: 'sendFollowToServer',
                                },

                                on: {
                                    __FOLLOW_USER_SUCCESS: {
                                        target: 'currentlyFollowingUser',
                                        actions:
                                            assignFollowedUserProfileInformation,
                                    },

                                    __FOLLOW_USER_FAILURE: {
                                        target: 'currentlyNotFollowingUser',
                                        actions:
                                            userProfileInformationModel.actions.displayFailureFollowOrUnfollowUserErrorToast(),
                                    },
                                },
                            },

                            sendingUnfollowUser: {
                                tags: 'loading',

                                invoke: {
                                    src: 'sendUnfollowToServer',
                                },

                                on: {
                                    __UNFOLLOW_USER_SUCCESS: {
                                        target: 'currentlyNotFollowingUser',
                                        actions:
                                            assignUnfollowedUserProfileInformation,
                                    },

                                    __UNFOLLOW_USER_FAILURE: {
                                        target: 'currentlyFollowingUser',
                                        actions:
                                            userProfileInformationModel.actions.displayFailureFollowOrUnfollowUserErrorToast(),
                                    },
                                },
                            },
                        },
                    },
                },
            },
            {
                services: {
                    retrieveUserProfileInformation: () => async (sendBack) => {
                        try {
                            const response = await getUserProfileInformation({
                                userID,
                            });

                            sendBack({
                                type: '__RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS',
                                userProfileInformation: response,
                            });
                        } catch (e) {
                            console.log('error occured', e);
                            sendBack({
                                type: '__RETRIEVE_USER_PROFILE_INFORMATION_FAILURE',
                            });
                        }
                    },
                    sendFollowToServer: () => async (sendBack) => {
                        try {
                            const { userProfileInformation } =
                                await sendFollowUser({
                                    userID,
                                });

                            sendBack({
                                type: '__FOLLOW_USER_SUCCESS',
                                userProfileInformation,
                            });
                        } catch (e) {
                            sendBack({
                                type: '__FOLLOW_USER_FAILURE',
                            });
                        }
                    },
                    sendUnfollowToServer: () => async (sendBack) => {
                        try {
                            const { userProfileInformation } =
                                await sendUnfollowUser({
                                    userID,
                                });

                            sendBack({
                                type: '__UNFOLLOW_USER_SUCCESS',
                                userProfileInformation,
                            });
                        } catch (e) {
                            sendBack({
                                type: '__UNFOLLOW_USER_FAILURE',
                            });
                        }
                    },
                },
            },
        )
        .withConfig(getUserProfileInformationMachineOptions());
}
