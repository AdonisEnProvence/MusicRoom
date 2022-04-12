import {
    GetMySettingsResponseBody,
    LinkGoogleAccountResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import { AuthSessionResult } from 'expo-auth-session';
import Toast from 'react-native-toast-message';
import invariant from 'tiny-invariant';
import { ActorRefFrom, assign, DoneInvokeEvent, forwardTo, send } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { createRetrieveUserGoogleAccessTokenMachine } from '../../machines/RetrieveUserGoogleAccessTokenMachine';
import { assertEventType } from '../../machines/utils';
import {
    sendLinkGoogleAccount,
    setUserPlaylistsSettingVisibility,
    setUserRelationsSettingVisibility,
} from '../../services/UserSettingsService';

const visibilitySettingModel = createModel(
    {
        lastSelectedVisibilityStatus: UserSettingVisibility.enum
            .PUBLIC as UserSettingVisibility,
    },
    {
        events: {
            'Update Visibility': (args: {
                visibility: UserSettingVisibility;
            }) => args,

            'Send Visibility Update to Backend': (args: {
                visibility: UserSettingVisibility;
            }) => args,
        },
        actions: {
            'Send updated visibility to server': () => ({}),
            'Assign visibility status to context': () => ({}),
        },
    },
);

const visibilitySettingMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QDUCWtUCNUBtUBcBPAAgGUx99UA7KAOjQ2zyLPwEN8BXWOgBS6Y8AYwDEAVQAOETmGKMsuAoUShJAewxV11VSAAeiAOwAGI3QCcFgBwAmI7evWAjAGYXAFgA0IFQgCsJq50-gBsrhZGVqa2-tYeAL4JPgrMymQUVLQM6IosJKQc3LwAYuo4OOoA7mAATrDEAPLUOIQS0rLyuWlEehpaqDp6hgi2oR50HrGBdrYmzm7evojOFrZ0pq7+zqE7Wx5GU0kp3Uqs5JQ09KlnBUU8-LWoAG6y7TL4cjf5fZoEg7okAZjGZLDZ7I4XO5nEs-M4jMFbK5TCYPKEzG5nGZjiBvukLllrqd8mxOA8AJLUf7sPAALzkNGpOGIsCKYFEvwGQyBIwAtEjzI4LLs4q4PM5bLYLD4-IF-CEdsLbDCPEFXK4cXjzpkrvw6hhWWBqMI5Ph1MQAELsYQAayNED19XQhOIZst1rt1AgoggOjAdBoz3UdsdBvwxCkH0gXSYt1JxU5-25oBGEtRG3R-iM-lcJkl-lssMQkURwocJgs2zRqM1xPxOuyfH1zqNJtd5qttvtdAAImBMOouMa5AAlMAARy4cHwDTdnc93v0rNkdHYADNPrU6LmTIntICU4hQmtt8qjOexvNz0WECW6FLQtmYcjH3Fa7GSQTdU2nYbh+33S7L1RHIL0YzydJI06OcPXtPcAWGYwJhMMxHHmUJCwWExQhlYsEXvMsqxfbNrCSZIQGodQIDgPQtQKBsiQ-fF7l4AQhFQYR4OTYEAmzbdrxcJxKww2xcIQVxnHlVYPHVQIdkLNF3wg7VLmyOj4weMoKmqfUmhaPw1D+fdEIQBw6BMaw80s1xQmPHNJTEiSpIsGStnQhTQiUnp6NUxjlLuMlWKeV5Pi4g8eKxZxrEsQJC1CfwZlzZxHPhOhj1cuSMI8RTyPUr81Lrc4WLoSkmVQeliEZKgaRZNkwpM3lsomDwsymFzhQslxHOsCxJhQg51WkiwIi8uN8r87yNPgIF+iTcK+TRaKWsOKUPA6pxkuWBAsRMe80TcGZwmy+ZRs-BjQxbf8YKAh1yQgHAwHqnkVhzaLUWPCUerGIworEyIJjFOwXLW-wZOxXLCp8wkLr-NtroXGGXXhuCZqMhDnoQawc23CzUQcbKbLiP6PGimxhskwtQf8GxTvrXzEdbU0O1gr1e37Qd-zHSdp1nZmbqew9xPGEIZmp9rDjcP7Dm3EnXDGV85Za2mVOhn8w0ZgD5xRwyuXmxBAnM1DLPk8UsXGMTrHCMEsZhRYIkk5WoauAWeMak9lratb0Q2sT7HvBKxgS+Kg+FMiEiAA */
    visibilitySettingModel.createMachine(
        {
            id: 'Visibility Setting',
            type: 'parallel',
            states: {
                'Visibility Status': {
                    initial: 'Initialize initial state',
                    states: {
                        'Initialize initial state': {
                            always: [
                                {
                                    cond: 'Initial visibility is Followers Only',
                                    target: '#Visibility Setting.Visibility Status.Followers Only',
                                },
                                {
                                    cond: 'Initial visibility is Public',
                                    target: '#Visibility Setting.Visibility Status.Public',
                                },
                                {
                                    cond: 'Initial visibility is Private',
                                    target: '#Visibility Setting.Visibility Status.Private',
                                },
                            ],
                        },
                        Public: {
                            tags: 'Public Visibility',
                            on: {
                                'Update Visibility': [
                                    {
                                        actions:
                                            'Send updated visibility to server',
                                        cond: 'Is Private Visibility',
                                        target: '#Visibility Setting.Visibility Status.Private',
                                    },
                                    {
                                        actions:
                                            'Send updated visibility to server',
                                        cond: 'Is Followers Only Visibility',
                                        target: '#Visibility Setting.Visibility Status.Followers Only',
                                    },
                                ],
                            },
                        },
                        'Followers Only': {
                            tags: 'Followers Only Visibility',
                            on: {
                                'Update Visibility': [
                                    {
                                        actions:
                                            'Send updated visibility to server',
                                        cond: 'Is Public Visibility',
                                        target: '#Visibility Setting.Visibility Status.Public',
                                    },
                                    {
                                        actions:
                                            'Send updated visibility to server',
                                        cond: 'Is Private Visibility',
                                        target: '#Visibility Setting.Visibility Status.Private',
                                    },
                                ],
                            },
                        },
                        Private: {
                            tags: 'Private Visibility',
                            on: {
                                'Update Visibility': [
                                    {
                                        actions:
                                            'Send updated visibility to server',
                                        cond: 'Is Public Visibility',
                                        target: '#Visibility Setting.Visibility Status.Public',
                                    },
                                    {
                                        actions:
                                            'Send updated visibility to server',
                                        cond: 'Is Followers Only Visibility',
                                        target: '#Visibility Setting.Visibility Status.Followers Only',
                                    },
                                ],
                            },
                        },
                    },
                },
                'Persistence to Backend': {
                    initial: 'Idle',
                    states: {
                        Idle: {},
                        'Persisting to Backend': {
                            invoke: {
                                src: 'Persist Updated Visibility Status',
                                id: 'Persist Updated Visibility Status',
                                onDone: [
                                    {
                                        actions:
                                            'Trigger acknowledgement toast',
                                        target: '#Visibility Setting.Persistence to Backend.Idle',
                                    },
                                ],
                            },
                        },
                        'Debounce Requests to Backend': {
                            after: {
                                '300': {
                                    target: '#Visibility Setting.Persistence to Backend.Persisting to Backend',
                                },
                            },
                        },
                    },
                    on: {
                        'Send Visibility Update to Backend': {
                            actions: 'Assign visibility status to context',
                            target: '#Visibility Setting.Persistence to Backend.Debounce Requests to Backend',
                        },
                    },
                },
            },
        },
        {
            guards: {
                'Initial visibility is Followers Only': (context) => {
                    return (
                        context.lastSelectedVisibilityStatus ===
                        'FOLLOWERS_ONLY'
                    );
                },

                'Initial visibility is Public': (context) => {
                    return context.lastSelectedVisibilityStatus === 'PUBLIC';
                },

                'Initial visibility is Private': (context) => {
                    return context.lastSelectedVisibilityStatus === 'PRIVATE';
                },

                'Is Public Visibility': (_context, event) => {
                    assertEventType(event, 'Update Visibility');

                    return event.visibility === 'PUBLIC';
                },

                'Is Followers Only Visibility': (_context, event) => {
                    assertEventType(event, 'Update Visibility');

                    return event.visibility === 'FOLLOWERS_ONLY';
                },

                'Is Private Visibility': (_context, event) => {
                    assertEventType(event, 'Update Visibility');

                    return event.visibility === 'PRIVATE';
                },
            },

            actions: {
                'Send updated visibility to server': send((_context, event) => {
                    assertEventType(event, 'Update Visibility');

                    return visibilitySettingModel.events[
                        'Send Visibility Update to Backend'
                    ]({
                        visibility: event.visibility,
                    });
                }),

                'Assign visibility status to context': assign({
                    lastSelectedVisibilityStatus: (_context, event) => {
                        assertEventType(
                            event,
                            'Send Visibility Update to Backend',
                        );

                        return event.visibility;
                    },
                }),
            },
        },
    );

export type VisibilitySettingMachineActor = ActorRefFrom<
    typeof visibilitySettingMachine
>;

const settingsModel = createModel(
    {
        mySettings: undefined as GetMySettingsResponseBody | undefined,
        userGoogleAccessToken: undefined as string | undefined,
    },
    {
        events: {
            'Update Playlists Visibility Setting': (
                visibility: UserSettingVisibility,
            ) => ({ visibility }),

            'Update Relations Visibility Setting': (
                visibility: UserSettingVisibility,
            ) => ({ visibility }),

            "successfully fetched user's settings": (
                mySettings: GetMySettingsResponseBody,
            ) => ({ mySettings }),

            "failed to fetch user's settings": () => ({}),

            'User links a google account': () => ({}),
            RECEIVED_GOOGLE_OAUTH_RESPONSE: (args: {
                googleResponse: AuthSessionResult;
            }) => args,
            __RETRIEVED_USER_GOOGLE_ACCESS_TOKEN_SUCCESSFULLY: (
                userGoogleAccessToken: string,
            ) => ({ userGoogleAccessToken }),
            __FAILED_TO_RETRIEVE_USER_GOOGLE_ACCESS_TOKEN: () => ({}),
        },
        actions: {
            "Assign user's settings to context": () => ({}),
            'Forward to Playlists Visibility Manager Machine': () => ({}),
            'Forward to Relations Visibility Manager Machine': () => ({}),

            'Display link google account operation success toast': () => ({}),
            'Display toast error link google account server error google id unavailable':
                () => ({}),
            'Display unknown link google account server error': () => ({}),
            'Reset user google access token from context': () => ({}),
        },
    },
);

export const settingsMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QGUwBc0EsB2VYDoAxdAYwAscoACAV1jACcByWK+jSggGQHsBDCJTZo+aMFQC2fbHxgSw2NPgAiYAEY8aJSgGIAHrBFj8fAGZiG+AMwAGG4lAAHHrExYe2ByD2IAjAFYbfAA2X2CAFl8bACZ-AA4Adn8rXziAGhAATz9E-Bsrf38AThtwmySE0riAX2qM1A5cAmI0ciE6RhY2dCwmolIKXElpWTB5RXwAJTAARxo4XuoO5lZ2RdgdCA8wfBwANx4Aax2G9f7WwaX6Fe7GvHO2oakZOQUlabmF9uuutc4EfY8EiiTAeADaNgAul5nK53J4kN5EEUrPgAsUinFgnFAr4Cr4MtkEFY4qjgilSr4UbF-MF-LV6j1OA9LrQfqsmX0Wo9qM9RuN3rN5oZvp0OXcNowGDxLI4ADaiUwyiT4U7M7ms5a-Tn3DVCPmvCYfYWLNli27rAHYA7A+EQ6GI2FuUEI0A+BAotGFIqY7G4-GExDhcIJaz+aJ0qzB8KkqPhBkgNVcgaim5-Jqbbb4QyiE465opoZa8XrGEuZ0eLzuhJUtGVXyRMoJBIx8KBhDRIrRfDFEPJYqJALBBIJpO6gaQM1p-P4AAKCsycswhlYADVl5g1Jgl2hMjoAKqOCC5qjzviL5doNcbrc7zJUMdluEuquIRJxfDhcNFbHhEolGx-HbXxolRBtCkqJJAiqGo6kTGcNUnYsLWZaYFXha9XFvNw90PY8xCoNCQQ8TDN23HCHx1J8K1dJEEHfT9v1-f87CArJECsaJuxsXxKiKfxwjpUDgliWo4OwHgIDgLwxwLC5U21CV8F4AQhBzAiDTGN4VHUTRtFwaj4VfBAAFpimsKMbDiXwbISaI4ms6JgM9KwRLiaJBLpbFsRHODZJZBSS2ZFTBCGdTxE0gVlP4UKoEMl9EXdKwEg-GyY1KGwigCWwEmc3w8kCKNXPA8l4z8hDCyuc103uEK1KMCKRkNNB4srRLEBM0kLLKazbPsxzgIbPJg2xaJmxKBsUlHCr5KLdkUOTWbeSarSjSFL45uq-NWto90TNAooewiOzwmS+IHKKNt2OJS78ESHiI2iMImzxaalL1Tbp3eyrhheVbBRIMBMD2JD5pq+BHXLIz2uJSp8ASKwu2CYJLvyQr2xJfwQgbBH-DsrtALKxlvqWqdFLOD7lr+qKAFEGGlBhIB24ySUO3jBOiOxhypAT22DD9SRsUbCnyS7hzeimfuQ8GAqeFaBWZmH9vJI6Qw8s6HLiS6MaiEIyjxU6MrsKwJfVKWwe2yHnzat0Ovs0NaTV06kk17XrsiArkqSAJSniBtTcW8hQa2pSzwvFcqHXLDyN3RXbY9Tt8AjcMozslISSc67QIduIYzxIoa0y2kTfKkmg4gMmgr6IiMMjm8Y6JJwoYS+Ou0O5PQLV9P3L51zGPJElsTxMaA-HC5g6+0srZo4ycXCRjO2YzLWPbQIvU8lII35mtR4hpvrd2jqUnyx2To1i6rqJEyUnwFEa04kM4kyp-XLE6ogA */
    settingsModel.createMachine(
        {
            id: 'Settings',
            initial: "Fetching user's settings",
            states: {
                "Fetching user's settings": {
                    type: 'parallel',
                    states: {
                        'Loading state management': {
                            initial: 'Deboucing',
                            states: {
                                Deboucing: {
                                    tags: 'Debouncing loading state',
                                    after: {
                                        '300': {
                                            target: "#Settings.Fetching user's settings.Loading state management.Loading",
                                        },
                                    },
                                },
                                Loading: {
                                    tags: "Loading user's settings",
                                    type: 'final',
                                },
                            },
                        },
                        'Fetching management': {
                            initial: "Requesting user's settings",
                            states: {
                                "Requesting user's settings": {},
                                "Received user's settings": {
                                    type: 'final',
                                },
                                Errored: {
                                    tags: "Errored fetching user's settings",
                                },
                            },
                            onDone: {
                                target: "#Settings.Fetched user's settings",
                            },
                        },
                    },
                },
                "Fetched user's settings": {
                    tags: "Fetched user's settings",
                    type: 'parallel',
                    states: {
                        'Playlists Visibility': {
                            invoke: {
                                src: 'Playlists Visibility Manager Machine',
                                id: 'Playlists Visibility Manager Machine',
                            },
                            on: {
                                'Update Playlists Visibility Setting': {
                                    actions:
                                        'Forward to Playlists Visibility Manager Machine',
                                    target: "#Settings.Fetched user's settings.Playlists Visibility",
                                    internal: true,
                                },
                            },
                        },
                        'Relations Visibility': {
                            invoke: {
                                src: 'Relations Visibility Manager Machine',
                                id: 'Relations Visibility Manager Machine',
                            },
                            on: {
                                'Update Relations Visibility Setting': {
                                    actions:
                                        'Forward to Relations Visibility Manager Machine',
                                    target: "#Settings.Fetched user's settings.Relations Visibility",
                                    internal: true,
                                },
                            },
                        },
                        'Link Google account manager': {
                            initial: 'Has user already linked a google account',

                            states: {
                                'Has user already linked a google account': {
                                    always: [
                                        {
                                            cond: 'User has already linked a google account',
                                            target: 'User has linked a google account successfully',
                                        },
                                        {
                                            target: 'Waiting for user to start a link google account operation',
                                        },
                                    ],
                                },

                                'Waiting for user to start a link google account operation':
                                    {
                                        /**
                                         * We're reseting this context prop in case the user encounters an error during the google
                                         * authentication process and has to restart everything from there
                                         */
                                        entry: 'Reset user google access token from context',

                                        invoke: {
                                            id: 'retrieveUserGoogleAccesTokenMachine',

                                            src: createRetrieveUserGoogleAccessTokenMachine(),
                                        },

                                        states: {
                                            'Retrieve user google access token failed':
                                                {},
                                        },

                                        on: {
                                            RECEIVED_GOOGLE_OAUTH_RESPONSE: {
                                                actions: forwardTo(
                                                    'retrieveUserGoogleAccesTokenMachine',
                                                ),
                                            },

                                            __RETRIEVED_USER_GOOGLE_ACCESS_TOKEN_SUCCESSFULLY:
                                                {
                                                    actions:
                                                        settingsModel.assign({
                                                            userGoogleAccessToken:
                                                                (
                                                                    _context,
                                                                    {
                                                                        userGoogleAccessToken,
                                                                    },
                                                                ) =>
                                                                    userGoogleAccessToken,
                                                        }),
                                                    target: 'Persist user google access token to server',
                                                },

                                            __FAILED_TO_RETRIEVE_USER_GOOGLE_ACCESS_TOKEN:
                                                {
                                                    target: '.Retrieve user google access token failed',
                                                },
                                        },
                                    },

                                'Persist user google access token to server': {
                                    invoke: {
                                        src: 'sendUserLinkGoogleAccount',

                                        onDone: [
                                            {
                                                cond: 'linkGoogleAccountErrorRetrievedGoogleAccountUnavailable',

                                                actions:
                                                    'Display toast error link google account server error google id unavailable',

                                                target: "#Settings.Fetched user's settings.Link Google account manager.Waiting for user to start a link google account operation",
                                            },
                                            {
                                                actions: [
                                                    'Display link google account operation success toast',
                                                    'reset user google access token from context',
                                                ],

                                                target: "#Settings.Fetched user's settings.Link Google account manager.User has linked a google account successfully",
                                            },
                                        ],

                                        onError: {
                                            actions:
                                                'Display unknown link google account server error',

                                            target: "#Settings.Fetched user's settings.Link Google account manager.Waiting for user to start a link google account operation",
                                        },
                                    },
                                },

                                'User has linked a google account successfully':
                                    {
                                        tags: 'UserHasLinkedGoogleAccount',
                                        type: 'final',
                                    },
                            },
                        },
                    },
                },
            },
            on: {
                "successfully fetched user's settings": {
                    actions: "Assign user's settings to context",
                    target: "#Settings.Fetching user's settings.Fetching management.Received user's settings",
                },

                "failed to fetch user's settings": {
                    target: "#Settings.Fetching user's settings.Fetching management.Errored",
                },
            },
        },
        {
            services: {
                'Playlists Visibility Manager Machine': ({ mySettings }) => {
                    invariant(
                        mySettings !== undefined,
                        "User's settings must have been fetched before invoking visibility settings machines",
                    );

                    return visibilitySettingMachine
                        .withConfig({
                            services: {
                                'Persist Updated Visibility Status': async ({
                                    lastSelectedVisibilityStatus,
                                }) => {
                                    invariant(
                                        lastSelectedVisibilityStatus !==
                                            undefined,
                                        'lastSelectedVisibilityStatus must have been assigned before trying to send it to the server',
                                    );

                                    await setUserPlaylistsSettingVisibility({
                                        visibility:
                                            lastSelectedVisibilityStatus,
                                    });
                                },
                            },

                            actions: {
                                'Trigger acknowledgement toast': () => {
                                    Toast.show({
                                        type: 'success',
                                        text1: 'Playlists visibility updated successfully',
                                    });
                                },
                            },
                        })
                        .withContext({
                            lastSelectedVisibilityStatus:
                                mySettings.playlistsVisibilitySetting,
                        });
                },

                'Relations Visibility Manager Machine': ({ mySettings }) => {
                    invariant(
                        mySettings !== undefined,
                        "User's settings must have been fetched before invoking visibility settings machines",
                    );

                    return visibilitySettingMachine
                        .withConfig({
                            services: {
                                'Persist Updated Visibility Status': async ({
                                    lastSelectedVisibilityStatus,
                                }) => {
                                    invariant(
                                        lastSelectedVisibilityStatus !==
                                            undefined,
                                        'lastSelectedVisibilityStatus must have been assigned before trying to send it to the server',
                                    );

                                    await setUserRelationsSettingVisibility({
                                        visibility:
                                            lastSelectedVisibilityStatus,
                                    });
                                },
                            },

                            actions: {
                                'Trigger acknowledgement toast': () => {
                                    Toast.show({
                                        type: 'success',
                                        text1: 'Relations visibility updated successfully',
                                    });
                                },
                            },
                        })
                        .withContext({
                            lastSelectedVisibilityStatus:
                                mySettings.relationsVisibilitySetting,
                        });
                },

                sendUserLinkGoogleAccount: async ({
                    userGoogleAccessToken,
                }) => {
                    invariant(
                        userGoogleAccessToken !== undefined,
                        'access token must be defined to be sent to server',
                    );

                    return await sendLinkGoogleAccount({
                        userGoogleAccessToken,
                    });
                },
            },

            guards: {
                'User has already linked a google account': (context) => {
                    return (
                        context.mySettings !== undefined &&
                        context.mySettings.hasLinkedGoogleAccount === true
                    );
                },

                linkGoogleAccountErrorRetrievedGoogleAccountUnavailable: (
                    _context,
                    e,
                ) => {
                    const event =
                        e as DoneInvokeEvent<LinkGoogleAccountResponseBody>;

                    if (event.data.status !== 'FAILURE') {
                        return false;
                    }

                    return event.data.linkGoogleAccountFailureReasons.includes(
                        'UNAVAILABLE_GOOGLE_ID',
                    );
                },
            },

            actions: {
                "Assign user's settings to context": assign({
                    mySettings: (_context, event) => {
                        assertEventType(
                            event,
                            "successfully fetched user's settings",
                        );

                        return event.mySettings;
                    },
                }),

                'Forward to Playlists Visibility Manager Machine': send(
                    (_context, event) => {
                        assertEventType(
                            event,
                            'Update Playlists Visibility Setting',
                        );

                        return visibilitySettingModel.events[
                            'Update Visibility'
                        ]({
                            visibility: event.visibility,
                        });
                    },
                    {
                        to: 'Playlists Visibility Manager Machine',
                    },
                ),

                'Forward to Relations Visibility Manager Machine': send(
                    (_context, event) => {
                        assertEventType(
                            event,
                            'Update Playlists Visibility Setting',
                        );

                        return visibilitySettingModel.events[
                            'Update Visibility'
                        ]({
                            visibility: event.visibility,
                        });
                    },
                    {
                        to: 'Relations Visibility Manager Machine',
                    },
                ),

                'Display link google account operation success toast': () => {
                    Toast.show({
                        type: 'success',
                        text1: 'Google account linked successfully',
                    });
                },

                'Display toast error link google account server error google id unavailable':
                    () => {
                        Toast.show({
                            type: 'error',
                            text1: 'Link google account error',
                            text2: 'Retrieved google account is unavailable',
                        });
                    },

                'Display unknown link google account server error': () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Link google account error',
                        text2: 'We encountered an error please try again later',
                    });
                },

                'Reset user google access token from context': assign({
                    userGoogleAccessToken: (_context) => undefined,
                }),
            },
        },
    );
