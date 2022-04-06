import { createMachine, EventFrom } from 'xstate';
import { createModel as createTestModel } from '@xstate/test';
import cases from 'jest-in-case';
import Toast from 'react-native-toast-message';
import { rest } from 'msw';
import { AuthSessionResult } from 'expo-auth-session';
import {
    AuthenticateWithGoogleOauthRequestBody,
    AuthenticateWithGoogleOauthResponseBody,
} from '@musicroom/types';
import { internet } from 'faker/locale/zh_TW';
import {
    render,
    renderUnauthenticatedApp,
    fireEvent,
    waitFor,
    CLIENT_INTEG_TEST_USER_ID,
} from '../tests/tests-utils';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { db } from '../tests/data';
import { server } from '../tests/server/test-server';

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const googleAuthMachine =
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
                      type: 'Make server send back an nickname nor email invalid error';
                  }
                | {
                      type: 'Make server send back an nickname nor email unavailable error';
                  }
                | {
                      type: 'Make server send back an unknown error';
                  },
        },
        initial: 'Rendering signing in screen',
        states: {
            'Rendering signing in screen': {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const signingInScreenTitle = await screen.findByText(
                            /welcome.*back/i,
                        );
                        expect(signingInScreenTitle).toBeTruthy();
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

                    'Server user access token verification error': {
                        states: {
                            'Invalid related nickname or email': {
                                meta: {
                                    test: async () => {
                                        await waitFor(() => {
                                            expect(
                                                Toast.show,
                                            ).toHaveBeenCalledWith({
                                                type: 'error',
                                                text1: 'Continue with google error',
                                                text2: 'Google account nickname or email is invalid',
                                            });
                                        });
                                    },
                                },
                            },
                            'Unavailable related nickname or email': {
                                meta: {
                                    test: async () => {
                                        await waitFor(() => {
                                            expect(
                                                Toast.show,
                                            ).toHaveBeenCalledWith({
                                                type: 'error',
                                                text1: 'Continue with google error',
                                                text2: 'Google account nickname or email is unavailable',
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
                                                text1: 'Continue with google error',
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
                        target: '#app.Rendering home screen',
                    },
                    'Make google authentication fail by cancel': {
                        target: 'Rendering signing in screen.Google authentication failed.User cancelled google oauth',
                    },
                    'Make google authentication fail by dismiss': {
                        target: 'Rendering signing in screen.Google authentication failed.User dismissed google oauth',
                    },
                    'Make google authentication fail by locked': {
                        target: 'Rendering signing in screen.Google authentication failed.User google account is locked',
                    },
                    'Make google authentication fail by response error': {
                        target: 'Rendering signing in screen.Google authentication failed.Google response error',
                    },
                    'Make server send back an nickname nor email unavailable error':
                        {
                            target: 'Rendering signing in screen.Server user access token verification error.Unavailable related nickname or email',
                        },
                    'Make server send back an nickname nor email invalid error':
                        {
                            target: 'Rendering signing in screen.Server user access token verification error.Invalid related nickname or email',
                        },
                    'Make server send back an unknown error': {
                        target: 'Rendering signing in screen.Server user access token verification error.Unknown server error',
                    },
                },
            },

            'Rendering home screen': {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        await waitFor(() => {
                            expect(Toast.show).toHaveBeenCalledWith({
                                type: 'success',
                                text1: 'Continue with google succeeded',
                            });

                            expect(
                                screen.getAllByText(/home/i).length,
                            ).toBeGreaterThanOrEqual(1);
                        });
                    },
                },
            },
        },
        id: 'app',
    });

async function pressContinueWithGoogleButton(
    screen: ReturnType<typeof render>,
) {
    const continueWithGoogleAuthenticationButton = await screen.findByTestId(
        'continue-with-google-authentication-button',
    );
    expect(continueWithGoogleAuthenticationButton).toBeTruthy();

    fireEvent.press(continueWithGoogleAuthenticationButton);
}

const googleAuthenticationTestModel = createTestModel<TestingContext>(
    googleAuthMachine,
).withEvents({
    'Make google and server send back successful oauth': async ({ screen }) => {
        await pressContinueWithGoogleButton(screen);
    },

    'Make server send back an nickname nor email invalid error': async ({
        screen,
    }) => {
        server.use(
            rest.post<
                AuthenticateWithGoogleOauthRequestBody,
                never,
                AuthenticateWithGoogleOauthResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/authenticate-with-google-oauth`,
                (req, res, ctx) => {
                    return res(
                        ctx.status(400),
                        ctx.json({
                            status: 'FAILURE',
                            googleAuthSignUpFailure: [
                                'INVALID_EMAIL',
                                'INVALID_NICKNAME',
                            ],
                        }),
                    );
                },
            ),
        );

        await pressContinueWithGoogleButton(screen);
    },

    'Make server send back an nickname nor email unavailable error': async ({
        screen,
    }) => {
        server.use(
            rest.post<
                AuthenticateWithGoogleOauthRequestBody,
                never,
                AuthenticateWithGoogleOauthResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/authenticate-with-google-oauth`,
                (req, res, ctx) => {
                    return res(
                        ctx.status(400),
                        ctx.json({
                            status: 'FAILURE',
                            googleAuthSignUpFailure: [
                                'UNAVAILABLE_EMAIL',
                                'UNAVAILABLE_NICKNAME',
                            ],
                        }),
                    );
                },
            ),
        );

        await pressContinueWithGoogleButton(screen);
    },

    'Make server send back an unknown error': async ({ screen }) => {
        server.use(
            rest.post<
                AuthenticateWithGoogleOauthRequestBody,
                never,
                AuthenticateWithGoogleOauthResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/authenticate-with-google-oauth`,
                (_req, res, ctx) => {
                    return res(ctx.status(500));
                },
            ),
        );

        await pressContinueWithGoogleButton(screen);
    },

    'Make google authentication fail by dismiss': async ({ screen }) => {
        server.use(
            rest.get<never, never, AuthSessionResult>(
                `http://msw.google.domain/fake-google-oauth-service`,
                (_req, res, ctx) => {
                    return res(
                        ctx.status(200),
                        ctx.json({
                            type: 'dismiss',
                        }),
                    );
                },
            ),
        );

        await pressContinueWithGoogleButton(screen);
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

        await pressContinueWithGoogleButton(screen);
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

        await pressContinueWithGoogleButton(screen);
    },

    'Make google authentication fail by response error': async ({ screen }) => {
        server.use(
            rest.get<never, never, AuthSessionResult>(
                `http://msw.google.domain/fake-google-oauth-service`,
                (req, res, ctx) => {
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
        await pressContinueWithGoogleButton(screen);
    },
});

cases<{
    target:
        | {
              'Rendering signing in screen':
                  | {
                        'Google authentication failed':
                            | 'Google response error'
                            | 'User dismissed google oauth'
                            | 'User google account is locked'
                            | 'User cancelled google oauth';
                    }
                  | {
                        'Server user access token verification error':
                            | 'Invalid related nickname or email'
                            | 'Unavailable related nickname or email'
                            | 'Unknown server error';
                    };
          }
        | 'Rendering home screen';
    events: EventFrom<typeof googleAuthMachine>[];
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

        const screen = await renderUnauthenticatedApp();

        const plan = googleAuthenticationTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({ screen });
    },
    {
        'Continue with google authentication successfully': {
            target: 'Rendering home screen',
            events: [
                {
                    type: 'Make google and server send back successful oauth',
                },
            ],
        },
        'Continue with google authentication failed du to google response error':
            {
                target: {
                    'Rendering signing in screen': {
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
                    'Rendering signing in screen': {
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
                    'Rendering signing in screen': {
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
                    'Rendering signing in screen': {
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
        'Continue with google authentication failed du to extracted credentials invalidity':
            {
                target: {
                    'Rendering signing in screen': {
                        'Server user access token verification error':
                            'Invalid related nickname or email',
                    },
                },
                events: [
                    {
                        type: 'Make server send back an nickname nor email invalid error',
                    },
                ],
            },
        'Continue with google authentication failed du to extracted credentials unavailability':
            {
                target: {
                    'Rendering signing in screen': {
                        'Server user access token verification error':
                            'Unavailable related nickname or email',
                    },
                },
                events: [
                    {
                        type: 'Make server send back an nickname nor email unavailable error',
                    },
                ],
            },
        'Continue with google authentication failed from server unknown error':
            {
                target: {
                    'Rendering signing in screen': {
                        'Server user access token verification error':
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
