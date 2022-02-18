import { UserProfileInformation } from '@musicroom/types';
import { createModel } from 'xstate/lib/model';
import { assign } from 'xstate';
import Toast from 'react-native-toast-message';
import { assertEventType } from '../../machines/utils';

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

export const userInformationMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QFVZgE4AICSA7AZgPboC2AhgC4CWhumAsmQMYAWVuYAdAOplXW4oAYgAesCpS5l8FDJwDMABkWJQAB0Kx+NXKpAjEAWgCMANgCsnYwBZFpgJzmA7PfvyAHIqcAaEAE9EY0VrK2N5ACYnZWNw8NN3BwBfRN9UDBwCYnJqWgZmNg4hAGUAVyYmMEhITApCTHQwCnQqMAA3MEwStHQAclhMNXRCfCoAGw72IlJKHT0NLRzdJH1EJxDjDdMt+2t5JVd3XwCEc0VOSK8nYyclUxvza3Nk1O6MqeydPNZ2MCEAMT44wgNTqDSaLXanW6fQGQxG40wkyyM1oc002lRywMJ3M8k49ncUXCynspms4XMh38iHk9isTgclPc9huUXc1mSKRAuEIEDgejSWDw7xRdEY3w4PD4AigaIWsyxRg2Tk45h28nM4Tcu0UByOSoUtjCuuMrgJ7kipmeIEFb2Riy+BS4yFwAGseQB3OhdDByjFLUDYq6mKxuc03ezBR76hDhYzuVVKCK40yRB57a224X2z7ip2cADSnu93T9iz02JseOU7ItxPM5jJMfC8mM+Os9mMDeV1gZDczr2z0wdeZ+nCKLEIHswo0IZAg7CgiNwC6YlGIZYVgaMkTxTkpDbVEV2MXMzfjqsepzukfsxPkHK5Wcyw9z+R+m8x24Qhi1Kv37iHm44QnhSMYmPIKrBMyDJkgSvbyJyiRAA */
    userInformationModel.createMachine(
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
                    actions: "Display failure retrieving user's profile toast",
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
                "Display failure retrieving user's profile toast": () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Failed to retrieve user profile information',
                    });
                },
            },
        },
    );
