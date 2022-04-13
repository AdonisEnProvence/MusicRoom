import { createMachine, EventFrom } from 'xstate';
import { createModel as createTestModel } from '@xstate/test';
import cases from 'jest-in-case';
import Toast from 'react-native-toast-message';
import { rest } from 'msw';
import { AuthSessionResult } from 'expo-auth-session';
import {
    LinkGoogleAccountRequestBody,
    LinkGoogleAccountResponseBody,
} from '@musicroom/types';
import { internet } from 'faker';
import {
    render,
    fireEvent,
    waitFor,
    renderApp,
    CLIENT_INTEG_TEST_USER_ID,
} from '../tests/tests-utils';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { server } from '../tests/server/test-server';
import { db } from '../tests/data';

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const linkGoogleAuthMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QAUCGtYHcD2AnCABLnGAC4B0ASmAHYRi4CWNUBsjUNzrzbAxsVoBiACoBPAA5gCYALapGAG0SgJ2dqUbYaKkAA9EAWgBMATmPkADJYAsxgMwB2B8csBWABwAaEGMQBGR38rew9bf2Mw+1D-NwBfOJ80DBx8IhIKajoGbjYOLhYCXlgBMGFqAEcAVzhSAgl0LDxCYlgyXTUNLR0kfUQANkDye0Hox0tTGzd-Wx8-BGNB8n6JoLdTfw8PR0d7BKTG1JaMqlp6JkL2Tlzi0uEAWVQAa2lcVFJpRUZZRjriVD4AAtIB11L9uroDAhDNEPOQZh57JMPIMbP1+vY5ogzDYrKYPGZHCiIpZIvsQMkmmlWmRTtkLqwrgUeDR+IIaEJHi8CFUaE8aNhMKyGLg8ARsHw+FVcKCutpIUZ7ItyFtzNZ+uNnI4sQgbPY3ORTP03PYbBFFqZLcYEokQAL6PBepSjuk2pkzjlLvkbqySuzyABJCCKMCy8Hy3pQlY62KOQ0eQIeGw7SweUzjfrk53NV20rLnXJMn1sso0cgAEUYsAkilQYly-yBkCI70+31+BFI2HQpDDmgjoCjlh1xjcuPTFoclqmSvituz1JO+c9jO9hVu-sr1dr9fXNAAbqgvoQ5ApFJ3u7Be71OuGeoOBsPfIh9cEjSNrKSwhMbFnDjmaXdelCzXFkS1oCsqxrOtcl5flBWFXBRVwC8ez7CFI0fHUbBsOFTDHNxLEcY0SLcTN53-Rc3TpAsvWuPdwLLLdoN3RkqklOBYFQq90IHPoEDI4Y0VsfDPBRGxLR1QZgjcYjPE2KYZmiP8UgApcPQZPJ6LAv1S0g7cYMKU8lCKLi5AkUgxAII8GGvVQwX7e9+LcA1-BwpURNsGxLE2HUTQNI0VinHYiWIlSqWOajl00osGN02heKcqF7GCNy9VcCSvJ87xnwQZx4wxZwkRRIj-HCl1AMShVoRGCwESRXDUXRTFcsMSwrAmawgmMM1036FwkxtOIgA */
    createMachine({
        schema: {
            context: {} as {
                email: string;
                hasReachedRateLimit: boolean;
                hasUnknownErrorOccured: boolean;
            },
            events: {} as
                | {
                      type: 'Make google and server send back successful oauth';
                  }
                | {
                      type: 'Make google authentication fail by dismiss';
                  }
                | {
                      type: 'Make google authentication fail by cancel';
                  }
                | {
                      type: 'Make google authentication fail by locked';
                  }
                | {
                      type: 'Make google authentication fail by response error';
                  }
                | {
                      type: 'Make server send back an googleID unavailable';
                  }
                | {
                      type: 'Make server send back an unknown error';
                  },
        },
        initial: 'Rendering my profile settings screen',
        states: {
            'Rendering my profile settings screen': {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        expect(
                            await screen.findByTestId(
                                'my-profile-page-container',
                            ),
                        ).toBeTruthy();
                    },
                },

                initial: 'Idle',
                states: {
                    Idle: {},

                    'Google authentication failed': {
                        states: {
                            'Google response error': {
                                meta: {
                                    test: async () => {
                                        console.log(
                                            'entering google response error meta test',
                                        );
                                        await waitFor(() => {
                                            expect(
                                                Toast.show,
                                            ).toHaveBeenCalledWith({
                                                type: 'error',
                                                text1: 'Continue with google error',
                                                text2: 'Google sent back an error please try again later',
                                            });
                                        });
                                    },
                                },
                            },
                            'User dismissed google oauth': {
                                meta: {
                                    test: async () => {
                                        console.log(
                                            'entering google authentication user dismissed google oauth meta instance',
                                        );
                                        await waitFor(() => {
                                            expect(
                                                Toast.show,
                                            ).toHaveBeenCalledWith({
                                                type: 'error',
                                                text1: 'Continue with google error',
                                                text2: 'Oauth verification was dismissed',
                                            });
                                        });
                                    },
                                },
                            },
                            'User google account is locked': {
                                meta: {
                                    test: async () => {
                                        await waitFor(() => {
                                            expect(
                                                Toast.show,
                                            ).toHaveBeenCalledWith({
                                                type: 'error',
                                                text1: 'Continue with google error',
                                                text2: 'Given account is locked',
                                            });
                                        });
                                    },
                                },
                            },
                            'User cancelled google oauth': {
                                meta: {
                                    test: async () => {
                                        await waitFor(() => {
                                            expect(
                                                Toast.show,
                                            ).toHaveBeenCalledWith({
                                                type: 'error',
                                                text1: 'Continue with google error',
                                                text2: 'Oauth verification was cancelled',
                                            });
                                        });
                                    },
                                },
                            },
                        },
                    },

                    'Server link accont user access token verification error': {
                        states: {
                            'Unavailable googleID': {
                                meta: {
                                    test: async () => {
                                        await waitFor(() => {
                                            expect(
                                                Toast.show,
                                            ).toHaveBeenCalledWith({
                                                type: 'error',
                                                text1: 'Link google account error',
                                                text2: 'Retrieved google account is unavailable',
                                            });
                                        });
                                    },
                                },
                            },
                            'Unknown server error': {
                                meta: {
                                    test: async () => {
                                        await waitFor(() => {
                                            expect(
                                                Toast.show,
                                            ).toHaveBeenCalledWith({
                                                type: 'error',
                                                text1: 'Link google account error',
                                                text2: 'We encountered an error please try again later',
                                            });
                                        });
                                    },
                                },
                            },
                        },
                    },
                },

                on: {
                    'Make google and server send back successful oauth': {
                        target: '#app.Rendering my profile settings screen with disabled link google account button',
                    },
                    'Make google authentication fail by cancel': {
                        target: '#app.Rendering my profile settings screen.Google authentication failed.User cancelled google oauth',
                    },
                    'Make google authentication fail by dismiss': {
                        target: '#app.Rendering my profile settings screen.Google authentication failed.User dismissed google oauth',
                    },
                    'Make google authentication fail by locked': {
                        target: '#app.Rendering my profile settings screen.Google authentication failed.User google account is locked',
                    },
                    'Make google authentication fail by response error': {
                        target: '#app.Rendering my profile settings screen.Google authentication failed.Google response error',
                    },
                    'Make server send back an unknown error': {
                        target: '#app.Rendering my profile settings screen.Server link accont user access token verification error.Unknown server error',
                    },
                    'Make server send back an googleID unavailable': {
                        target: '#app.Rendering my profile settings screen.Server link accont user access token verification error.Unavailable googleID',
                    },
                },
            },

            'Rendering my profile settings screen with disabled link google account button':
                {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await waitFor(() => {
                                expect(Toast.show).toHaveBeenCalledWith({
                                    type: 'success',
                                    text1: 'Google account linked successfully',
                                });

                                const linkAccountGoogleButton =
                                    screen.getByTestId(
                                        'my-settings-link-google-account-button',
                                    );
                                expect(linkAccountGoogleButton).toBeTruthy();
                                expect(linkAccountGoogleButton).toBeDisabled();
                            });
                        },
                    },
                },
        },
        id: 'app',
    });

async function pressLinkGoogleAccountButton(screen: ReturnType<typeof render>) {
    const linkGoogleAccountButton = await screen.findByTestId(
        'my-settings-link-google-account-button',
    );

    await waitFor(() => {
        expect(linkGoogleAccountButton).toBeTruthy();
        expect(linkGoogleAccountButton).not.toBeDisabled();
    });

    fireEvent.press(linkGoogleAccountButton);
}

const googleAuthenticationTestModel = createTestModel<TestingContext>(
    linkGoogleAuthMachine,
).withEvents({
    'Make google and server send back successful oauth': async ({ screen }) => {
        await pressLinkGoogleAccountButton(screen);
    },

    'Make server send back an googleID unavailable': async ({ screen }) => {
        server.use(
            rest.post<
                LinkGoogleAccountRequestBody,
                never,
                LinkGoogleAccountResponseBody
            >(`${SERVER_ENDPOINT}/me/link-google-account`, (_req, res, ctx) => {
                return res(
                    ctx.status(400),
                    ctx.json({
                        status: 'FAILURE',
                        linkGoogleAccountFailureReasons: [
                            'UNAVAILABLE_GOOGLE_ID',
                        ],
                    }),
                );
            }),
        );

        await pressLinkGoogleAccountButton(screen);
    },

    'Make server send back an unknown error': async ({ screen }) => {
        server.use(
            rest.post<
                LinkGoogleAccountRequestBody,
                never,
                LinkGoogleAccountResponseBody
            >(`${SERVER_ENDPOINT}/me/link-google-account`, (_req, res, ctx) => {
                return res(ctx.status(500));
            }),
        );

        await pressLinkGoogleAccountButton(screen);
    },

    'Make google authentication fail by dismiss': async ({ screen }) => {
        server.use(
            rest.get<never, never, AuthSessionResult>(
                `http://msw.google.domain/fake-google-oauth-service`,
                (_req, res, ctx) => {
                    console.log('MOCK CALLED');
                    return res(
                        ctx.status(200),
                        ctx.json({
                            type: 'dismiss',
                        }),
                    );
                },
            ),
        );

        await pressLinkGoogleAccountButton(screen);
    },

    'Make google authentication fail by cancel': async ({ screen }) => {
        server.use(
            rest.get<never, never, AuthSessionResult>(
                `http://msw.google.domain/fake-google-oauth-service`,
                (_req, res, ctx) => {
                    return res(
                        ctx.status(200),
                        ctx.json({
                            type: 'cancel',
                        }),
                    );
                },
            ),
        );

        await pressLinkGoogleAccountButton(screen);
    },

    'Make google authentication fail by locked': async ({ screen }) => {
        server.use(
            rest.get<never, never, AuthSessionResult>(
                `http://msw.google.domain/fake-google-oauth-service`,
                (_req, res, ctx) => {
                    return res(
                        ctx.status(200),
                        ctx.json({
                            type: 'locked',
                        }),
                    );
                },
            ),
        );

        await pressLinkGoogleAccountButton(screen);
    },

    'Make google authentication fail by response error': async ({ screen }) => {
        server.use(
            rest.get<never, never, AuthSessionResult>(
                `http://msw.google.domain/fake-google-oauth-service`,
                (req, res, ctx) => {
                    console.log('GOOGLE MOCK CALLED');
                    return res(
                        ctx.status(200),
                        ctx.json({
                            type: 'error',
                            errorCode: null,
                            authentication: null,
                            params: {},
                            url: '',
                            error: undefined,
                        }),
                    );
                },
            ),
        );

        await pressLinkGoogleAccountButton(screen);
    },
});

cases<{
    target:
        | {
              'Rendering my profile settings screen':
                  | {
                        'Google authentication failed':
                            | 'Google response error'
                            | 'User dismissed google oauth'
                            | 'User google account is locked'
                            | 'User cancelled google oauth';
                    }
                  | {
                        'Server link accont user access token verification error':
                            | 'Unavailable googleID'
                            | 'Unknown server error';
                    };
          }
        | 'Rendering my profile settings screen with disabled link google account button';
    events: EventFrom<typeof linkGoogleAuthMachine>[];
}>(
    'Google authentication',
    async ({ target, events }) => {
        db.myProfileInformation.create({
            userID: CLIENT_INTEG_TEST_USER_ID,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: internet.userName(),
            hasConfirmedEmail: true,
        });

        const screen = await renderApp();

        const myProfileIcon = await screen.findByTestId(
            'open-my-profile-page-button',
        );
        expect(myProfileIcon).toBeTruthy();
        fireEvent.press(myProfileIcon);

        expect(
            await screen.findByTestId('my-profile-page-container'),
        ).toBeTruthy();

        const goToMyProfileSettingsButton = await screen.findByTestId(
            'go-to-my-settings-button',
        );
        expect(goToMyProfileSettingsButton).toBeTruthy();
        fireEvent.press(goToMyProfileSettingsButton);

        expect(
            await screen.findByTestId('my-profile-settings-page-container'),
        ).toBeTruthy();

        const plan = googleAuthenticationTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({ screen });
    },
    {
        'Continue with google authentication successfully': {
            target: 'Rendering my profile settings screen with disabled link google account button',
            events: [
                {
                    type: 'Make google and server send back successful oauth',
                },
            ],
        },
        'Continue with google authentication failed du to google response error':
            {
                target: {
                    'Rendering my profile settings screen': {
                        'Google authentication failed': 'Google response error',
                    },
                },
                events: [
                    {
                        type: 'Make google authentication fail by response error',
                    },
                ],
            },
        'Continue with google authentication failed as user dismissed oauth verification':
            {
                target: {
                    'Rendering my profile settings screen': {
                        'Google authentication failed':
                            'User dismissed google oauth',
                    },
                },
                events: [
                    {
                        type: 'Make google authentication fail by dismiss',
                    },
                ],
            },
        'Continue with google authentication failed as user account is locked':
            {
                target: {
                    'Rendering my profile settings screen': {
                        'Google authentication failed':
                            'User google account is locked',
                    },
                },
                events: [
                    {
                        type: 'Make google authentication fail by locked',
                    },
                ],
            },
        'Continue with google authentication failed as user cancelled oauth verification':
            {
                target: {
                    'Rendering my profile settings screen': {
                        'Google authentication failed':
                            'User cancelled google oauth',
                    },
                },
                events: [
                    {
                        type: 'Make google authentication fail by cancel',
                    },
                ],
            },
        'Continue with google authentication failed du to extracted credentials unavailability':
            {
                target: {
                    'Rendering my profile settings screen': {
                        'Server link accont user access token verification error':
                            'Unavailable googleID',
                    },
                },
                events: [
                    {
                        type: 'Make server send back an googleID unavailable',
                    },
                ],
            },
        'Continue with google authentication failed from server unknown error':
            {
                target: {
                    'Rendering my profile settings screen': {
                        'Server link accont user access token verification error':
                            'Unknown server error',
                    },
                },
                events: [
                    {
                        type: 'Make server send back an unknown error',
                    },
                ],
            },
    },
);
