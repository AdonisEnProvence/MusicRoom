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
import { datatype, internet } from 'faker';
import {
    render,
    renderUnauthenticatedApp,
    fireEvent,
    waitFor,
} from '../tests/tests-utils';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { db, generateAuthenticationUser } from '../tests/data';

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
                      type: 'Press continue with google authentication button';
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
                            'unknown server error': {
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
                    'Press continue with google authentication button': {
                        target: 'Rendering home screen',
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
                            target: 'Rendering signing in screen.Google authentication failed.Unavailable related nickname or email',
                        },
                    'Make server send back an nickname nor email invalid error':
                        {
                            target: 'Rendering signing in screen.Google authentication failed.Invalid related nickname or email',
                        },
                },
            },

            'Rendering home screen': {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        await waitFor(() => {
                            expect(
                                screen.getAllByText(/home/i).length,
                            ).toBeGreaterThanOrEqual(1);

                            expect(Toast.show).toHaveBeenCalledWith({
                                type: 'success',
                                text1: 'Continue with google succeeded',
                            });
                        });
                    },
                },
            },
        },
        id: 'Password reset',
    });

const resetPasswordTestModel = createTestModel<TestingContext>(
    googleAuthMachine,
).withEvents({
    'Press continue with google authentication button': async ({ screen }) => {
        const continueWithGoogleAuthenticationButton =
            await screen.findByTestId(
                'continue-with-google-authentication-button',
            );
        expect(continueWithGoogleAuthenticationButton).toBeTruthy();

        fireEvent.press(continueWithGoogleAuthenticationButton);
    },

    'Make server send back an nickname nor email invalid error': () => {
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
        );
    },

    'Make server send back an nickname nor email unavailable error': () => {
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
        );
    },

    'Make google authentication fail by dismiss': () => {
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
        );
    },

    'Make google authentication fail by cancel': () => {
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
        );
    },

    'Make google authentication fail by locked': () => {
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
        );
    },

    'Make google authentication fail by response error': () => {
        rest.get<never, never, AuthSessionResult>(
            `http://msw.google.domain/fake-google-oauth-service`,
            (_req, res, ctx) => {
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
        );
    },
});

const existingUser = generateAuthenticationUser();

cases<{
    target:
        | {
              'Rendering signing in screen': {
                  'Google authentication failed':
                      | 'Google response error'
                      | 'User dismissed google oauth'
                      | 'User google account is locked'
                      | 'User cancelled google oauth'
                      | 'Invalid related nickname or email'
                      | 'Unavailable related nickname or email'
                      | 'unknown server error';
              };
          }
        | 'Rendering home screen';
    events: EventFrom<typeof googleAuthMachine>[];
}>(
    'Google authentication',
    async ({ target, events }) => {
        db.authenticationUser.create(existingUser);
        db.myProfileInformation.create({
            userID: existingUser.uuid,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: existingUser.nickname,
            hasConfirmedEmail: true,
        });

        const screen = await renderUnauthenticatedApp();

        const plan = resetPasswordTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({ screen });
    },
    {
        'Continue with google authentication successfully': {
            target: 'Rendering home screen',
            events: [
                {
                    type: 'Press continue with google authentication button',
                },
            ],
        },
        'Continue with google authentication failed du to google response error':
            {
                target: 'Rendering home screen',
                events: [
                    {
                        type: 'Make google authentication fail by response error',
                    },
                    {
                        type: 'Press continue with google authentication button',
                    },
                ],
            },
        'Continue with google authentication failed as user dismissed oauth verification':
            {
                target: 'Rendering home screen',
                events: [
                    {
                        type: 'Make google authentication fail by dismiss',
                    },
                    {
                        type: 'Press continue with google authentication button',
                    },
                ],
            },
        'Continue with google authentication failed as user account is locked':
            {
                target: 'Rendering home screen',
                events: [
                    {
                        type: 'Make google authentication fail by locked',
                    },
                    {
                        type: 'Press continue with google authentication button',
                    },
                ],
            },
        'Continue with google authentication failed as user cancelled oauth verification':
            {
                target: 'Rendering home screen',
                events: [
                    {
                        type: 'Make google authentication fail by response error',
                    },
                    {
                        type: 'Press continue with google authentication button',
                    },
                ],
            },
        'Continue with google authentication failed du to extracted credentials invalidity':
            {
                target: 'Rendering home screen',
                events: [
                    {
                        type: 'Make server send back an nickname nor email invalid error',
                    },
                    {
                        type: 'Press continue with google authentication button',
                    },
                ],
            },
        'Continue with google authentication failed du to extracted credentials unavailability':
            {
                target: 'Rendering home screen',
                events: [
                    {
                        type: 'Make server send back an nickname nor email unavailable error',
                    },
                    {
                        type: 'Press continue with google authentication button',
                    },
                ],
            },
    },
);
