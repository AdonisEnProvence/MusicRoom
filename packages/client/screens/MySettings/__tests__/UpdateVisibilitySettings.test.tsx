import {
    GetMySettingsResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import { EventFrom } from 'xstate';
import cases from 'jest-in-case';
import Toast from 'react-native-toast-message';
import { getCurrentPositionAsync, LocationObject } from 'expo-location';
import { datatype, internet } from 'faker';
import { rest } from 'msw';
import invariant from 'tiny-invariant';
import {
    fireEvent,
    render,
    renderApp,
    within,
    waitFor,
    CLIENT_INTEG_TEST_USER_ID,
    noop,
} from '../../../tests/tests-utils';
import { db } from '../../../tests/data';
import { assertEventType } from '../../../machines/utils';
import { SERVER_ENDPOINT } from '../../../constants/Endpoints';
import { server } from '../../../tests/server/test-server';
import { withAuthentication } from '../../../tests/server/handlers';

interface TestingContext {
    screen: ReturnType<typeof render> | undefined;
    nickname: string;
    initialPlaylistsVisibilitySetting: UserSettingVisibility;
    initialRelationsVisibilitySetting: UserSettingVisibility;
}

const updateVisibilitySettingsModel = createModel(
    {
        initialPlaylistsVisibilitySetting: undefined as
            | UserSettingVisibility
            | undefined,
        initialRelationsVisibilitySetting: undefined as
            | UserSettingVisibility
            | undefined,
    },
    {
        events: {
            'Delay API response and render application': () => ({}),

            'Make API respond instantly and render application': () => ({}),

            'Make API fail and render application': () => ({}),

            'Start interacting with the application': (args: {
                initialPlaylistsVisibility: UserSettingVisibility;
                initialRelationsVisibility: UserSettingVisibility;
            }) => args,

            'Update Playlists Visibility': (args: {
                visibility: UserSettingVisibility;
            }) => args,

            'Update Relations Visibility': (args: {
                visibility: UserSettingVisibility;
            }) => args,
        },
    },
);

const assignInitialVisibilitySettingsToContext =
    updateVisibilitySettingsModel.assign(
        {
            initialPlaylistsVisibilitySetting: (_context, event) =>
                event.initialPlaylistsVisibility,
            initialRelationsVisibilitySetting: (_context, event) =>
                event.initialRelationsVisibility,
        },
        'Start interacting with the application',
    );

const updateVisibilitySettingsMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QFUAOECGAXMACAagJayEBGhANoVgJ64DKYWWhAdlLAHQCSr1hGKgC82UAMQARMBQx0AggAVuuAE5xUAe1awwiUJpIstekAA9EAJgCcAdk4BmAAwBGG84BsFi-asBWR77uADQgNIgAtFbODgAsXu4xHs5WKTYxAL7pIWiYOATEZJTUdIzMoly8-IKEIuxiALIYANZ4ispqsJqsELhssFgYrFgUYUggBvzGY+YIge6czha+ABzuab5ecc4ho+FpnKkWMTa+Vj5HFjaZ2ejYeEQk5FS0DEws7BV8LNW14o0tuDauAAZhhKCYJkZWCYZlYEpx3LZnL5fPYfO5nPYLDsIlZHJwYikNo5ls5HEsbH5riAcnd8o8ii9Su8ODxtAMhiNcLAABYaADuolwAFcdCoAOSwblvcpiABKYG6YBUuAwqFQVAAxthCFN9BpDLrodNEKcLJwTgE0Zd7IkYr4cQhkdEbO4Nu5lhY3d5rNTaXkHoVniUZR9OPQ+YL2NyWhQmFopRgpRQNBgIEKBi0pbANABbPAsfPyxUQZWq9VanV68YGybG0AzJwxTjLElWS5RfyuGyOjz4gJHXzIs54vy+P23AMFJ7FV5lMMAMSYmp5kBFYsl0vnrIUMhoVH6XAUwtIWrE-rwu9kB6wUsDM9oENrUJhlnsvhbzlWcJs5IsjnfHtQkQBJ8SsVY3Q9FFPHsdwJ1ye5p0ZENty4JcsBXNdRWVTcdFQzgr33Yhb04BcNAoFN+WVKUAHlWBGc9J0vPcbzvJDgyfQ1qxmGwvU4CxFl8QkzQEqxHTiD9PS-ZYsXsT0NkueC6XvZC5xZNDl1XHpsIlbNQx3FjiKPFRCAANzuRiENwQjWPpINik4utXwQNxzWcOJSXsXj7TtR1QIOCDAmWaDvDgrIaSYuyHxQ9TSM0rCNz0-CFRkKEjxPM8L1wFKq20KLkMcl8TRcxYES8ElkSWQJFl7ZJ8ScX80TcFErnCrKVODNTyjijCtPXHCktinK0tI8jKOo3A6IYrLhqNNiGQ4sZISNZyLGWZYHFg+1SThVFgsdcDzWOGJHDdADfBsLFliUqcFtnZluvQzDtMSrchukXLjLMiyZo+tL8sW-UuPrMxEFcsr-1JDZoJq4CEFsD93PiRxHHA5J1sycLWA0Ut4DGdr2Pu-TPiqYRREKlbioujaUZ8Gw0lOxmYkdcIBPmFYzkcNJMS8Kw4huxC7qZYm2X6QZhjoXkBSFHTcOJinuNNfxP2WPFjhWI57UdZXBJOKJeLxS4wpuKyOqJ-CI2l6NYFjeM8qTXAUzTDNmjgbk8wLQh8wVkGZmcTEERJGIdrRGIw4SbXzScclURiTxUZ8ewBYB83YoXME4x6J302jWXBvKH3nPbdn3DWaxYJ5z1tasfi+w7Qd3LhZOzeF-Cnr6vO3u6myjIIjLCE1QvivAzh-H8U64+sKItbhod8QZ0uXDcb8rGbwnW7T+KXoGruwx7w9RoogUJqm0Ygac4qyQDr8w89D1-2sYJZ4Do5TvcJev0RVe2siluYsere-VdK7wMteXuCgTLmRwEPBspoTgtnpqXRBcdPT2EdMvUel1PDrSHL+Nwa8hb-0XIAzueFYr71vDA0GLlmxjxRgkTwKR3IOjhu+c0MlUYnHfnCOEzgCH2Q3gA3qCUd5kO6rNBMfdTwDyoTMC6H4nAySiGtdwtooi9kZpwU6ZIvIAS-B4JOP9TbryIayduIjgFiLDBI7Qh9xoqFovRM+NZgZFw2nQiejDp4sNGGSd+WiMQAUavo1R-DopdWIcI7eliRY2K+lA3QS1nyU1gU6AcCJSQDhWK2ZmcM-HmmqkEvRpJQlGOUiYiJZiSGvSsayOJsiwa0ICPQyeTCZ6jENgsIciRbRxC5liMJqkHqROekAuWqEGmzHxB4hhU93Jx0dB2FsJ1Fiq1RBdAIrUTblMIZUvG58iqpL4jM1p08Flw1ZqrUerZ-yN28IEISmN0hAA */
    updateVisibilitySettingsModel.createMachine(
        {
            id: 'Update Visibility Settings',
            initial: 'Initializing',
            states: {
                Initializing: {
                    meta: {
                        test: ({ screen }: TestingContext) => {
                            expect(screen).toBeUndefined();
                        },
                    },
                    on: {
                        'Delay API response and render application': {
                            target: '#Update Visibility Settings.Showing skeletons as loading takes some time',
                        },
                        'Make API respond instantly and render application': {
                            target: "#Update Visibility Settings.Instantly showing user's settings",
                        },
                        'Make API fail and render application': {
                            target: "#Update Visibility Settings.Failed loading user's settings",
                        },
                    },
                },
                "Instantly showing user's settings": {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'Screen must have been rendered before being in this state',
                            );

                            let foundLoadingIndicator = false;
                            await waitFor(() => {
                                const loadingIndicator =
                                    screen.queryByLabelText(
                                        /loading.*your.*settings/i,
                                    );
                                if (
                                    foundLoadingIndicator === false &&
                                    loadingIndicator !== null
                                ) {
                                    foundLoadingIndicator = true;
                                }

                                expect(
                                    screen.getByText(/personal.*information/i),
                                ).toBeTruthy();
                            });

                            expect(foundLoadingIndicator).toBeFalsy();
                        },
                    },
                    on: {
                        'Start interacting with the application': {
                            target: "#Update Visibility Settings.Fetched user's settings",
                            actions: assignInitialVisibilitySettingsToContext,
                        },
                    },
                },
                'Showing skeletons as loading takes some time': {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'Screen must have been rendered before being in this state',
                            );

                            await waitFor(() => {
                                expect(
                                    screen.getByLabelText(
                                        /loading.*your.*settings/i,
                                    ),
                                ).toBeTruthy();
                            });

                            await waitFor(() => {
                                expect(
                                    screen.getByText(/personal.*information/i),
                                ).toBeTruthy();
                            });
                        },
                    },
                    on: {
                        'Start interacting with the application': {
                            target: "#Update Visibility Settings.Fetched user's settings",
                            actions: assignInitialVisibilitySettingsToContext,
                        },
                    },
                },
                "Failed loading user's settings": {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'Screen must have been rendered before being in this state',
                            );

                            await waitFor(() => {
                                expect(
                                    screen.getByText(
                                        /error.*loading.*settings/i,
                                    ),
                                ).toBeTruthy();
                            });
                        },
                    },
                    type: 'final',
                },
                "Fetched user's settings": {
                    type: 'parallel',
                    states: {
                        Nickname: {
                            meta: {
                                test: async ({
                                    screen,
                                    nickname,
                                }: TestingContext) => {
                                    invariant(
                                        screen !== undefined,
                                        'Screen must have been rendered before being in this state',
                                    );

                                    await waitFor(() => {
                                        expect(
                                            screen.getByText(nickname),
                                        ).toBeTruthy();
                                    });
                                },
                            },
                        },
                        Playlists: {
                            initial: 'Init',
                            states: {
                                Init: {
                                    always: [
                                        {
                                            cond: 'Initial playlists visibility is Public',
                                            target: 'Public',
                                        },
                                        {
                                            cond: 'Initial playlists visibility is Private',
                                            target: 'Private',
                                        },
                                        {
                                            cond: 'Initial playlists visibility is Followers Only',
                                            target: 'Followers Only',
                                        },
                                    ],
                                },
                                Public: {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            invariant(
                                                screen !== undefined,
                                                'Screen must have been rendered before sending this event',
                                            );

                                            const playlistsVisibilitySettingRadioGroup =
                                                await screen.findByTestId(
                                                    'playlists-visibility-radio-group',
                                                );
                                            expect(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).toBeTruthy();

                                            const selectedRadio = await within(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).findByA11yState({
                                                selected: true,
                                            });
                                            expect(selectedRadio).toBeTruthy();

                                            expect(
                                                selectedRadio,
                                            ).toHaveTextContent(/public/i);
                                        },
                                    },
                                    on: {
                                        'Update Playlists Visibility': [
                                            {
                                                cond: 'Is Private Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Playlists.Private",
                                            },
                                            {
                                                cond: 'Is Followers Only Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Playlists.Followers Only",
                                            },
                                        ],
                                    },
                                },
                                'Followers Only': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            invariant(
                                                screen !== undefined,
                                                'Screen must have been rendered before sending this event',
                                            );

                                            const playlistsVisibilitySettingRadioGroup =
                                                await screen.findByTestId(
                                                    'playlists-visibility-radio-group',
                                                );
                                            expect(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).toBeTruthy();

                                            const selectedRadio = await within(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).findByA11yState({
                                                selected: true,
                                            });
                                            expect(selectedRadio).toBeTruthy();

                                            expect(
                                                selectedRadio,
                                            ).toHaveTextContent(
                                                /followers.*only/i,
                                            );
                                        },
                                    },
                                    on: {
                                        'Update Playlists Visibility': [
                                            {
                                                cond: 'Is Public Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Playlists.Public",
                                            },
                                            {
                                                cond: 'Is Private Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Playlists.Private",
                                            },
                                        ],
                                    },
                                },
                                Private: {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            invariant(
                                                screen !== undefined,
                                                'Screen must have been rendered before sending this event',
                                            );

                                            const playlistsVisibilitySettingRadioGroup =
                                                await screen.findByTestId(
                                                    'playlists-visibility-radio-group',
                                                );
                                            expect(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).toBeTruthy();

                                            const selectedRadio = await within(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).findByA11yState({
                                                selected: true,
                                            });
                                            expect(selectedRadio).toBeTruthy();

                                            expect(
                                                selectedRadio,
                                            ).toHaveTextContent(/private/i);
                                        },
                                    },
                                    on: {
                                        'Update Playlists Visibility': [
                                            {
                                                cond: 'Is Followers Only Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Playlists.Followers Only",
                                            },
                                            {
                                                cond: 'Is Public Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Playlists.Public",
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                        Relations: {
                            initial: 'Init',
                            states: {
                                Init: {
                                    always: [
                                        {
                                            cond: 'Initial relations visibility is Public',
                                            target: 'Public',
                                        },
                                        {
                                            cond: 'Initial relations visibility is Private',
                                            target: 'Private',
                                        },
                                        {
                                            cond: 'Initial relations visibility is Followers Only',
                                            target: 'Followers Only',
                                        },
                                    ],
                                },
                                Public: {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            invariant(
                                                screen !== undefined,
                                                'Screen must have been rendered before sending this event',
                                            );

                                            const playlistsVisibilitySettingRadioGroup =
                                                await screen.findByTestId(
                                                    'relations-visibility-radio-group',
                                                );
                                            expect(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).toBeTruthy();

                                            const selectedRadio = await within(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).findByA11yState({
                                                selected: true,
                                            });
                                            expect(selectedRadio).toBeTruthy();

                                            expect(
                                                selectedRadio,
                                            ).toHaveTextContent(/public/i);
                                        },
                                    },
                                    on: {
                                        'Update Relations Visibility': [
                                            {
                                                cond: 'Is Private Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Relations.Private",
                                            },
                                            {
                                                cond: 'Is Followers Only Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Relations.Followers Only",
                                            },
                                        ],
                                    },
                                },
                                'Followers Only': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            invariant(
                                                screen !== undefined,
                                                'Screen must have been rendered before sending this event',
                                            );

                                            const playlistsVisibilitySettingRadioGroup =
                                                await screen.findByTestId(
                                                    'relations-visibility-radio-group',
                                                );
                                            expect(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).toBeTruthy();

                                            const selectedRadio = await within(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).findByA11yState({
                                                selected: true,
                                            });
                                            expect(selectedRadio).toBeTruthy();

                                            expect(
                                                selectedRadio,
                                            ).toHaveTextContent(
                                                /followers.*only/i,
                                            );
                                        },
                                    },
                                    on: {
                                        'Update Relations Visibility': [
                                            {
                                                cond: 'Is Public Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Relations.Public",
                                            },
                                            {
                                                cond: 'Is Private Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Relations.Private",
                                            },
                                        ],
                                    },
                                },
                                Private: {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            invariant(
                                                screen !== undefined,
                                                'Screen must have been rendered before sending this event',
                                            );

                                            const playlistsVisibilitySettingRadioGroup =
                                                await screen.findByTestId(
                                                    'relations-visibility-radio-group',
                                                );
                                            expect(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).toBeTruthy();

                                            const selectedRadio = await within(
                                                playlistsVisibilitySettingRadioGroup,
                                            ).findByA11yState({
                                                selected: true,
                                            });
                                            expect(selectedRadio).toBeTruthy();

                                            expect(
                                                selectedRadio,
                                            ).toHaveTextContent(/private/i);
                                        },
                                    },
                                    on: {
                                        'Update Relations Visibility': [
                                            {
                                                cond: 'Is Public Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Relations.Public",
                                            },
                                            {
                                                cond: 'Is Followers Only Visibility',
                                                target: "#Update Visibility Settings.Fetched user's settings.Relations.Followers Only",
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        {
            guards: {
                'Initial playlists visibility is Public': ({
                    initialPlaylistsVisibilitySetting,
                }) => {
                    if (initialPlaylistsVisibilitySetting === undefined) {
                        return false;
                    }

                    return initialPlaylistsVisibilitySetting === 'PUBLIC';
                },

                'Initial playlists visibility is Private': ({
                    initialPlaylistsVisibilitySetting,
                }) => {
                    if (initialPlaylistsVisibilitySetting === undefined) {
                        return false;
                    }

                    return initialPlaylistsVisibilitySetting === 'PRIVATE';
                },

                'Initial playlists visibility is Followers Only': ({
                    initialPlaylistsVisibilitySetting,
                }) => {
                    if (initialPlaylistsVisibilitySetting === undefined) {
                        return false;
                    }

                    return (
                        initialPlaylistsVisibilitySetting === 'FOLLOWERS_ONLY'
                    );
                },

                'Initial relations visibility is Public': ({
                    initialRelationsVisibilitySetting,
                }) => {
                    if (initialRelationsVisibilitySetting === undefined) {
                        return false;
                    }

                    return initialRelationsVisibilitySetting === 'PUBLIC';
                },

                'Initial relations visibility is Private': ({
                    initialRelationsVisibilitySetting,
                }) => {
                    if (initialRelationsVisibilitySetting === undefined) {
                        return false;
                    }

                    return initialRelationsVisibilitySetting === 'PRIVATE';
                },

                'Initial relations visibility is Followers Only': ({
                    initialRelationsVisibilitySetting,
                }) => {
                    if (initialRelationsVisibilitySetting === undefined) {
                        return false;
                    }

                    return (
                        initialRelationsVisibilitySetting === 'FOLLOWERS_ONLY'
                    );
                },

                'Is Public Visibility': (_context, event) => {
                    assertEventType(event, [
                        'Update Playlists Visibility',
                        'Update Relations Visibility',
                    ]);

                    return event.visibility === 'PUBLIC';
                },

                'Is Private Visibility': (_context, event) => {
                    assertEventType(event, [
                        'Update Playlists Visibility',
                        'Update Relations Visibility',
                    ]);

                    return event.visibility === 'PRIVATE';
                },

                'Is Followers Only Visibility': (_context, event) => {
                    assertEventType(event, [
                        'Update Playlists Visibility',
                        'Update Relations Visibility',
                    ]);

                    return event.visibility === 'FOLLOWERS_ONLY';
                },
            },
        },
    );

const updateVisibilitySettingsTestModel = createTestModel<TestingContext>(
    updateVisibilitySettingsMachine,
).withEvents({
    'Delay API response and render application': async (context) => {
        server.use(
            rest.get<never, never, GetMySettingsResponseBody>(
                `${SERVER_ENDPOINT}/me/settings`,
                withAuthentication((_req, res, ctx) => {
                    const user = db.myProfileInformation.findFirst({
                        where: {
                            userID: {
                                equals: CLIENT_INTEG_TEST_USER_ID,
                            },
                        },
                    });
                    if (user === null) {
                        return res(ctx.status(404));
                    }

                    return res(
                        ctx.delay(600),
                        ctx.json({
                            nickname: user.userNickname,
                            playlistsVisibilitySetting:
                                user.playlistsVisibilitySetting,
                            relationsVisibilitySetting:
                                user.relationsVisibilitySetting,
                        }),
                    );
                }),
            ),
        );

        const screen = await renderApp();

        const goToMyProfileButton = await screen.findByLabelText(
            /open.*my.*profile/i,
        );
        expect(goToMyProfileButton).toBeTruthy();

        fireEvent.press(goToMyProfileButton);

        const goToMySettingsButton = await screen.findByLabelText(
            /open.*my.*settings/i,
        );
        expect(goToMySettingsButton).toBeTruthy();

        fireEvent.press(goToMySettingsButton);

        context.screen = screen;
    },

    'Make API respond instantly and render application': async (context) => {
        const screen = await renderApp();

        const goToMyProfileButton = await screen.findByLabelText(
            /open.*my.*profile/i,
        );
        expect(goToMyProfileButton).toBeTruthy();

        fireEvent.press(goToMyProfileButton);

        const goToMySettingsButton = await screen.findByLabelText(
            /open.*my.*settings/i,
        );
        expect(goToMySettingsButton).toBeTruthy();

        fireEvent.press(goToMySettingsButton);

        context.screen = screen;
    },

    'Make API fail and render application': async (context) => {
        server.use(
            rest.get<never, never, GetMySettingsResponseBody>(
                `${SERVER_ENDPOINT}/me/settings`,
                (_req, res, ctx) => {
                    return res(ctx.status(500));
                },
            ),
        );

        const screen = await renderApp();

        const goToMyProfileButton = await screen.findByLabelText(
            /open.*my.*profile/i,
        );
        expect(goToMyProfileButton).toBeTruthy();

        fireEvent.press(goToMyProfileButton);

        const goToMySettingsButton = await screen.findByLabelText(
            /open.*my.*settings/i,
        );
        expect(goToMySettingsButton).toBeTruthy();

        fireEvent.press(goToMySettingsButton);

        context.screen = screen;
    },

    'Start interacting with the application': noop,

    'Update Playlists Visibility': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof updateVisibilitySettingsModel,
            'Update Playlists Visibility'
        >;

        invariant(
            screen !== undefined,
            'Screen must have been rendered before sending this event',
        );

        const playlistsVisibilitySettingRadioGroup = await screen.findByTestId(
            'playlists-visibility-radio-group',
        );
        expect(playlistsVisibilitySettingRadioGroup).toBeTruthy();

        switch (event.visibility) {
            case 'PUBLIC': {
                const publicRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/public/i);
                expect(publicRadio).toBeTruthy();

                fireEvent.press(publicRadio);

                break;
            }

            case 'PRIVATE': {
                const privateRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/private/i);
                expect(privateRadio).toBeTruthy();

                fireEvent.press(privateRadio);

                break;
            }

            case 'FOLLOWERS_ONLY': {
                const followersOnlyRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/followers.*only/i);
                expect(followersOnlyRadio).toBeTruthy();

                fireEvent.press(followersOnlyRadio);

                break;
            }

            default: {
                throw new Error('Reached unreachable state');
            }
        }
    },

    'Update Relations Visibility': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof updateVisibilitySettingsModel,
            'Update Relations Visibility'
        >;

        invariant(
            screen !== undefined,
            'Screen must have been rendered before sending this event',
        );

        const playlistsVisibilitySettingRadioGroup = await screen.findByTestId(
            'relations-visibility-radio-group',
        );
        expect(playlistsVisibilitySettingRadioGroup).toBeTruthy();

        switch (event.visibility) {
            case 'PUBLIC': {
                const publicRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/public/i);
                expect(publicRadio).toBeTruthy();

                fireEvent.press(publicRadio);

                break;
            }

            case 'PRIVATE': {
                const privateRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/private/i);
                expect(privateRadio).toBeTruthy();

                fireEvent.press(privateRadio);

                break;
            }

            case 'FOLLOWERS_ONLY': {
                const followersOnlyRadio = within(
                    playlistsVisibilitySettingRadioGroup,
                ).getByText(/followers.*only/i);
                expect(followersOnlyRadio).toBeTruthy();

                fireEvent.press(followersOnlyRadio);

                break;
            }

            default: {
                throw new Error('Reached unreachable state');
            }
        }
    },
});

cases<{
    events: EventFrom<typeof updateVisibilitySettingsModel>[];
    target:
        | "Instantly showing user's settings"
        | 'Showing skeletons as loading takes some time'
        | "Failed loading user's settings";
}>(
    "Initial fetching of user's settings",
    async ({ events, target }) => {
        const userID = CLIENT_INTEG_TEST_USER_ID;

        const user = db.myProfileInformation.create({
            userID,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: internet.userName(),
            playlistsVisibilitySetting: 'PUBLIC',
            relationsVisibilitySetting: 'PUBLIC',
        });

        const plan = updateVisibilitySettingsTestModel.getPlanFromEvents(
            events,
            { target },
        );

        await plan.test({
            screen: undefined,
            nickname: user.userNickname,
            initialPlaylistsVisibilitySetting: 'PUBLIC',
            initialRelationsVisibilitySetting: 'PUBLIC',
        });
    },
    {
        "Instantly displays user's settings if the API responds fastly": {
            events: [
                updateVisibilitySettingsModel.events[
                    'Make API respond instantly and render application'
                ](),
            ],
            target: "Instantly showing user's settings",
        },

        'Displays loading indicator if API takes some time to respond': {
            events: [
                updateVisibilitySettingsModel.events[
                    'Delay API response and render application'
                ](),
            ],
            target: 'Showing skeletons as loading takes some time',
        },

        'Displays an error if the API returns an error': {
            events: [
                updateVisibilitySettingsModel.events[
                    'Make API fail and render application'
                ](),
            ],
            target: "Failed loading user's settings",
        },
    },
);

cases<{
    initialPlaylistsVisibility: UserSettingVisibility;
    initialRelationsVisibility: UserSettingVisibility;
    events: EventFrom<typeof updateVisibilitySettingsModel>[];
    target: {
        Nickname: Record<string, never>;
        Playlists: 'Public' | 'Private' | 'Followers Only';
        Relations: 'Public' | 'Private' | 'Followers Only';
    };
}>(
    'Change visibility settings',
    async ({
        initialPlaylistsVisibility,
        initialRelationsVisibility,
        events,
        target,
    }) => {
        const userID = CLIENT_INTEG_TEST_USER_ID;

        const user = db.myProfileInformation.create({
            userID,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: internet.userName(),
            playlistsVisibilitySetting: initialPlaylistsVisibility,
            relationsVisibilitySetting: initialRelationsVisibility,
        });

        const location: LocationObject = {
            timestamp: datatype.number(),
            coords: {
                accuracy: 4,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                latitude: datatype.number({
                    min: -80,
                    max: 75,
                }),
                longitude: datatype.number({
                    min: -180,
                    max: 175,
                }),
                speed: null,
            },
        };

        (getCurrentPositionAsync as any).mockImplementation(() => {
            return Promise.resolve(location);
        });

        const plan = updateVisibilitySettingsTestModel.getPlanFromEvents(
            events,
            {
                target: {
                    "Fetched user's settings": target,
                },
            },
        );

        await plan.test({
            screen: undefined,
            nickname: user.userNickname,
            initialPlaylistsVisibilitySetting: initialPlaylistsVisibility,
            initialRelationsVisibilitySetting: initialRelationsVisibility,
        });

        await waitFor(() => {
            expect(Toast.show).toHaveBeenCalledWith({
                type: 'success',
                text1: expect.any(String),
            });
        });
        expect(Toast.show).toHaveBeenCalledTimes(1);
    },
    {
        'Can set playlists visibility to public': {
            initialPlaylistsVisibility: 'PRIVATE',
            initialRelationsVisibility: 'PUBLIC',
            events: [
                updateVisibilitySettingsModel.events[
                    'Make API respond instantly and render application'
                ](),
                updateVisibilitySettingsModel.events[
                    'Start interacting with the application'
                ]({
                    initialPlaylistsVisibility: 'PRIVATE',
                    initialRelationsVisibility: 'PUBLIC',
                }),
                updateVisibilitySettingsModel.events[
                    'Update Playlists Visibility'
                ]({
                    visibility: 'PUBLIC',
                }),
            ],
            target: {
                Nickname: {},
                Playlists: 'Public',
                Relations: 'Public',
            },
        },

        'Can set playlists visibility to private': {
            initialPlaylistsVisibility: 'FOLLOWERS_ONLY',
            initialRelationsVisibility: 'PUBLIC',
            events: [
                updateVisibilitySettingsModel.events[
                    'Make API respond instantly and render application'
                ](),
                updateVisibilitySettingsModel.events[
                    'Start interacting with the application'
                ]({
                    initialPlaylistsVisibility: 'FOLLOWERS_ONLY',
                    initialRelationsVisibility: 'PUBLIC',
                }),
                updateVisibilitySettingsModel.events[
                    'Update Playlists Visibility'
                ]({
                    visibility: 'PRIVATE',
                }),
            ],
            target: {
                Nickname: {},
                Playlists: 'Private',
                Relations: 'Public',
            },
        },

        'Can set playlists visibility to followers only': {
            initialPlaylistsVisibility: 'PUBLIC',
            initialRelationsVisibility: 'PUBLIC',
            events: [
                updateVisibilitySettingsModel.events[
                    'Make API respond instantly and render application'
                ](),
                updateVisibilitySettingsModel.events[
                    'Start interacting with the application'
                ]({
                    initialPlaylistsVisibility: 'PUBLIC',
                    initialRelationsVisibility: 'PUBLIC',
                }),
                updateVisibilitySettingsModel.events[
                    'Update Playlists Visibility'
                ]({
                    visibility: 'FOLLOWERS_ONLY',
                }),
            ],
            target: {
                Nickname: {},
                Playlists: 'Followers Only',
                Relations: 'Public',
            },
        },

        'Can set relations visibility to public': {
            initialPlaylistsVisibility: 'PUBLIC',
            initialRelationsVisibility: 'PRIVATE',
            events: [
                updateVisibilitySettingsModel.events[
                    'Make API respond instantly and render application'
                ](),
                updateVisibilitySettingsModel.events[
                    'Start interacting with the application'
                ]({
                    initialPlaylistsVisibility: 'PUBLIC',
                    initialRelationsVisibility: 'PRIVATE',
                }),
                updateVisibilitySettingsModel.events[
                    'Update Relations Visibility'
                ]({
                    visibility: 'PUBLIC',
                }),
            ],
            target: {
                Nickname: {},
                Playlists: 'Public',
                Relations: 'Public',
            },
        },

        'Can set relations visibility to private': {
            initialPlaylistsVisibility: 'PUBLIC',
            initialRelationsVisibility: 'FOLLOWERS_ONLY',
            events: [
                updateVisibilitySettingsModel.events[
                    'Make API respond instantly and render application'
                ](),
                updateVisibilitySettingsModel.events[
                    'Start interacting with the application'
                ]({
                    initialPlaylistsVisibility: 'PUBLIC',
                    initialRelationsVisibility: 'FOLLOWERS_ONLY',
                }),
                updateVisibilitySettingsModel.events[
                    'Update Relations Visibility'
                ]({
                    visibility: 'PRIVATE',
                }),
            ],
            target: {
                Nickname: {},
                Playlists: 'Public',
                Relations: 'Private',
            },
        },

        'Can set relations visibility to followers only': {
            initialPlaylistsVisibility: 'PUBLIC',
            initialRelationsVisibility: 'PUBLIC',
            events: [
                updateVisibilitySettingsModel.events[
                    'Make API respond instantly and render application'
                ](),
                updateVisibilitySettingsModel.events[
                    'Start interacting with the application'
                ]({
                    initialPlaylistsVisibility: 'PUBLIC',
                    initialRelationsVisibility: 'PUBLIC',
                }),
                updateVisibilitySettingsModel.events[
                    'Update Relations Visibility'
                ]({
                    visibility: 'FOLLOWERS_ONLY',
                }),
            ],
            target: {
                Nickname: {},
                Playlists: 'Public',
                Relations: 'Followers Only',
            },
        },
    },
);
