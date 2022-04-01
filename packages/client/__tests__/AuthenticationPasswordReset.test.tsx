import { assign, createMachine, EventFrom } from 'xstate';
import { createModel as createTestModel } from '@xstate/test';
import cases from 'jest-in-case';
import Toast from 'react-native-toast-message';
import { rest } from 'msw';
import {
    RequestPasswordResetRequestBody,
    RequestPasswordResetResponseBody,
} from '@musicroom/types';
import { assertEventType } from '../machines/utils';
import {
    render,
    renderUnauthenticatedApp,
    waitFor,
    fireEvent,
    within,
} from '../tests/tests-utils';
import { server } from '../tests/server/test-server';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { db, generateAuthenticationUser } from '../tests/data';

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const passwordResetMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QAUCGtYHcD2AnCABLnGAC4B0ASmAHYRi4CWNUBsjUNzrzbAxsVoBiACoBPAA5gCYALapGAG0SgJ2dqUbYaKkAA9EAWgBMATmPkADJYAsxgMwB2B8csBWABwAaEGMQBGR38rew9bf2Mw+1D-NwBfOJ80DBx8IhIKajoGbjYOLhYCXlgBMGFqAEcAVzhSAgl0LDxCYlgyXTUNLR0kfUQANkDye0Hox0tTGzd-Wx8-BGNB8n6JoLdTfw8PR0d7BKTG1JaMqlp6JkL2Tlzi0uEAWVQAa2lcVFJpRUZZRjriVD4AAtIB11L9uroDAhDNEPOQZh57JMPIMbP1+vY5ogzDYrKYPGZHCiIpZIvsQMkmmlWmRTtkLqwrgUeDR+IIaEJHi8CFUaE8aNhMKyGLg8ARsHw+FVcKCutpIUZ7ItyFtzNZ+uNnI4sQgbPY3ORTP03PYbBFFqZLcYEokQAL6PBepSjuk2pkzjlLvkbqySuzyABJCCKMCy8Hy3pQlY62KOQ0eQIeGw7SweUzjfrk53NV20rLnXJMn1sso0cgAEUYsAkilQYly-yBkCI70+31+BFI2HQpDDmgjoCjlh1xjcuPTFoclqmSvituz1JO+c9jO9hVu-sr1dr9fXNAAbqgvoQ5ApFJ3u7Be71OuGeoOBsPfIh9cEjSNrKSwhMbFnDjmaXdelCzXFkS1oCsqxrOtcl5flBWFXBRVwC8ez7CFI0fHUbBsOFTDHNxLEcY0SLcTN53-Rc3TpAsvWuPdwLLLdoN3RkqklOBYFQq90IHPoEDI4Y0VsfDPBRGxLR1QZgjcYjPE2KYZmiP8UgApcPQZPJ6LAv1S0g7cYMKU8lCKLi5AkUgxAII8GGvVQwX7e9+LcA1-BwpURNsGxLE2HUTQNI0VinHYiWIlSqWOajl00osGN02heKcqF7GCNy9VcCSvJ87xnwQZx4wxZwkRRIj-HCl1AMShVoRGCwESRXDUXRTFcsMSwrAmawgmMM1036FwkxtOIgA */
    createMachine(
        {
            context: {
                email: 'devessier@devessier.fr',
                hasReachedRateLimit: false,
                hasUnknownErrorOccured: false,
            },
            schema: {
                context: {} as {
                    email: string;
                    hasReachedRateLimit: boolean;
                    hasUnknownErrorOccured: boolean;
                },
                events: {} as
                    | {
                          type: 'Type email';
                          email: string;
                      }
                    | {
                          type: 'Request password reset';
                      }
                    | {
                          type: 'Make rate limit reached';
                      }
                    | {
                          type: 'Make unknown error occur';
                      },
            },
            initial: 'Rendering signing in screen',
            states: {
                'Rendering signing in screen': {
                    initial: 'Idle',
                    states: {
                        Idle: {},
                        'Displaying reached rate limit toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'error',
                                                text1: expect.any(String),
                                                text2: expect.any(String),
                                            },
                                        );
                                    });
                                },
                            },
                        },
                        'Displaying invalid email toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'error',
                                                text1: expect.any(String),
                                                text2: expect.any(String),
                                            },
                                        );
                                    });
                                },
                            },
                        },
                        'Displaying unknown error toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'error',
                                                text1: expect.any(String),
                                                text2: expect.any(String),
                                            },
                                        );
                                    });
                                },
                            },
                        },
                        'Displaying success toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'success',
                                                text1: expect.any(String),
                                                text2: expect.any(String),
                                            },
                                        );
                                    });
                                },
                            },
                        },
                        'Displaying email is empty alert': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    await waitFor(() => {
                                        const signingInEmailField =
                                            screen.getByTestId(
                                                'signing-in-screen-email-field',
                                            );
                                        expect(
                                            signingInEmailField,
                                        ).toBeTruthy();

                                        const alert =
                                            within(
                                                signingInEmailField,
                                            ).getByRole('alert');
                                        expect(alert).toBeTruthy();

                                        expect(alert).toHaveTextContent(
                                            'This field is required',
                                        );
                                    });
                                },
                            },
                        },
                    },
                    on: {
                        'Type email': {
                            actions: 'Assign typed email to context',
                        },
                        'Request password reset': [
                            {
                                cond: 'Is email empty',
                                target: '.Displaying email is empty alert',
                            },
                            {
                                cond: 'Is email invalid',
                                target: '.Displaying invalid email toast',
                            },
                            {
                                cond: 'Has reached rate limit',
                                target: '.Displaying reached rate limit toast',
                            },
                            {
                                cond: 'Has unknown error occured',
                                target: '.Displaying unknown error toast',
                            },
                            {
                                target: '.Displaying success toast',
                            },
                        ],
                        'Make rate limit reached': {
                            actions:
                                'Assign rate limit has been reached to context',
                        },
                        'Make unknown error occur': {
                            actions: 'Assign unknown error occured to context',
                        },
                    },
                },
            },
            id: 'Password reset',
        },
        {
            guards: {
                'Has reached rate limit': (context) =>
                    context.hasReachedRateLimit === true,

                'Is email invalid': (context) =>
                    context.email !== existingUser.email,

                'Has unknown error occured': (context) =>
                    context.hasUnknownErrorOccured === true,

                'Is email empty': (context) => context.email.length === 0,
            },
            actions: {
                'Assign typed email to context': assign({
                    email: (_context, event) => {
                        assertEventType(event, 'Type email');

                        return event.email;
                    },
                }),

                'Assign rate limit has been reached to context': assign({
                    hasReachedRateLimit: (_context) => true,
                }),

                'Assign unknown error occured to context': assign({
                    hasUnknownErrorOccured: (_context) => true,
                }),
            },
        },
    );

const resetPasswordTestModel = createTestModel<TestingContext>(
    passwordResetMachine,
).withEvents({
    'Type email': async ({ screen }, e) => {
        const event = e as EventFrom<typeof passwordResetMachine, 'Type email'>;

        const emailField = await screen.findByPlaceholderText(/email/i);
        expect(emailField).toBeTruthy();

        fireEvent.changeText(emailField, event.email);
    },

    'Request password reset': async ({ screen }) => {
        const requestPasswordResetButton = await screen.findByText(
            /do.*you.*lost.*password/i,
        );
        expect(requestPasswordResetButton).toBeTruthy();

        fireEvent.press(requestPasswordResetButton);
    },

    'Make rate limit reached': () => {
        server.use(
            rest.post<
                RequestPasswordResetRequestBody,
                never,
                RequestPasswordResetResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/request-password-reset`,
                (_req, res, ctx) => {
                    return res(
                        ctx.status(429),
                        ctx.json({
                            status: 'REACHED_RATE_LIMIT',
                        }),
                    );
                },
            ),
        );
    },

    'Make unknown error occur': () => {
        server.use(
            rest.post<
                RequestPasswordResetRequestBody,
                never,
                RequestPasswordResetResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/request-password-reset`,
                (_req, res, ctx) => {
                    return res(ctx.status(500));
                },
            ),
        );
    },
});

const existingUser = generateAuthenticationUser();

cases<{
    target: {
        'Rendering signing in screen':
            | 'Displaying reached rate limit toast'
            | 'Displaying invalid email toast'
            | 'Displaying unknown error toast'
            | 'Displaying success toast'
            | 'Displaying email is empty alert';
    };
    events: EventFrom<typeof passwordResetMachine>[];
}>(
    'Password reset',
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
        'Shows success toast when password reset succeeded': {
            target: {
                'Rendering signing in screen': 'Displaying success toast',
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
        'Requires email to be filled to request a password reset': {
            target: {
                'Rendering signing in screen':
                    'Displaying email is empty alert',
            },
            events: [
                {
                    type: 'Type email',
                    email: '',
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
        'Shows error toast when email is invalid': {
            target: {
                'Rendering signing in screen': 'Displaying invalid email toast',
            },
            events: [
                {
                    type: 'Type email',
                    email: 'unknown-email@gmail.com',
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
        'Shows error toast when rate limit is reached': {
            target: {
                'Rendering signing in screen':
                    'Displaying reached rate limit toast',
            },
            events: [
                {
                    type: 'Make rate limit reached',
                },
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
        'Shows error toast when an unknown error occured': {
            target: {
                'Rendering signing in screen': 'Displaying unknown error toast',
            },
            events: [
                {
                    type: 'Make unknown error occur',
                },
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
    },
);
