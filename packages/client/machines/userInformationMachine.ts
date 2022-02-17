import { UserProfileInformation } from '@musicroom/types';
import { createModel } from 'xstate/lib/model';
import { assign } from 'xstate';
import { getUserProfileInformation } from '../services/UserProfileService';
import { getFakeUserID } from '../contexts/SocketContext';
import { assertEventType } from './utils';

const userInformationModel = createModel(
    {
        userProfileInformation: undefined as UserProfileInformation | undefined,
    },
    {
        events: {
            "Succeeded to retrieve user's profile information": (
                userProfileInformation: UserProfileInformation,
            ) => ({ userProfileInformation }),
            "Failed to retrieve user's profile information": () => ({}),
        },
        actions: {
            'Assign fetched user information to context': () => ({}),
            "Display failure retrieving user's profile toast": () => ({}),
        },
    },
);

type UserInformationMachine = ReturnType<
    typeof userInformationModel['createMachine']
>;

export function createUserInformationMachine(
    userID: string,
): UserInformationMachine {
    return userInformationModel
        .createMachine(
            {
                id: 'User Information Machine',
                invoke: {
                    src: "Fetch user's information",
                },
                initial: 'Waiting',
                states: {
                    Waiting: {
                        after: {
                            '300': {
                                target: '#User Information Machine.Show loading indicator',
                                internal: true,
                            },
                        },
                    },
                    'Unknown user': {
                        type: 'final',
                    },
                    'Known user': {
                        type: 'final',
                    },
                    'Show loading indicator': {},
                },
                on: {
                    "Succeeded to retrieve user's profile information": {
                        actions: 'Assign fetched user information to context',
                        internal: true,
                        target: '#User Information Machine.Known user',
                    },
                    "Failed to retrieve user's profile information": {
                        actions:
                            "Display failure retrieving user's profile toast",
                        internal: true,
                        target: '#User Information Machine.Unknown user',
                    },
                },
            },
            {
                actions: {
                    'Assign fetched user information to context': assign({
                        userProfileInformation: (_context, event) => {
                            assertEventType(
                                event,
                                "Succeeded to retrieve user's profile information",
                            );

                            return event.userProfileInformation;
                        },
                    }),
                },
            },
        )
        .withConfig({
            services: {
                "Fetch user's information": () => async (sendBack) => {
                    try {
                        const response = await getUserProfileInformation({
                            tmpAuthUserID: getFakeUserID(),
                            userID,
                        });

                        sendBack({
                            type: "Succeeded to retrieve user's profile information",
                            userProfileInformation: response,
                        });
                    } catch (e) {
                        console.log('error occured');
                        sendBack({
                            type: "Failed to retrieve user's profile information",
                        });
                    }
                },
            },
        });
}
