import { UserProfileInformation } from '@musicroom/types';
import { createModel } from 'xstate/lib/model';

const userInformationModel = createModel(
    {
        userProfileInformation: undefined as UserProfileInformation | undefined,
    },
    {
        events: {
            __RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS: (
                userProfileInformation: UserProfileInformation,
            ) => ({ userProfileInformation }),
            __RETRIEVE_USER_PROFILE_INFORMATION_FAILURE: () => ({}),
        },
        actions: {
            "Display failure retrieving user's profile toast": () => ({}),
        },
    },
);

const assignFetchedUserProfileInformation = userInformationModel.assign(
    {
        userProfileInformation: (_context, { userProfileInformation }) =>
            userProfileInformation,
    },
    '__RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS',
);

export const userInformationMachine = userInformationModel.createMachine({
    initial: "Fetching user's information",
    states: {
        "Fetching user's information": {
            tags: 'loading',

            invoke: {
                src: "Fetch user's information",
            },

            on: {
                __RETRIEVE_USER_PROFILE_INFORMATION_SUCCESS: {
                    actions: assignFetchedUserProfileInformation,
                    target: 'Known user',
                },

                __RETRIEVE_USER_PROFILE_INFORMATION_FAILURE: {
                    target: 'Unknown user',
                    actions: "Display failure retrieving user's profile toast",
                },
            },
        },

        'Unknown user': {
            tags: 'unknown user',
        },

        'Known user': {
            tags: 'known user',
        },
    },
});
