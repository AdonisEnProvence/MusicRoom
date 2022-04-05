import { assign, createMachine, EventFrom } from 'xstate';
import { createModel as createTestModel } from '@xstate/test';
import cases from 'jest-in-case';
import Toast from 'react-native-toast-message';
import { rest } from 'msw';
import {
    RequestPasswordResetRequestBody,
    RequestPasswordResetResponseBody,
    ValidatePasswordResetTokenRequestBody,
    ValidatePasswordResetTokenResponseBody,
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

const VALID_PASSWORD_RESET_CODE = '123456';

const passwordResetMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QAUCGtYHcD2AnCABLnGAC4B0ASmAHYRi4CWNUBsjUNzrzbAxsVoBiACoBPAA5gCYALapGAG0SgJ2dqUbYaKkAA9EAWgBMATmPkADJYAsxgMwB2B8csBWABwAaEGMQBGR38rew9bf2Mw+1D-NwBfOJ80DBx8IhIKajoGbjYOLhYCXlgBMGFqAEcAVzhSAgl0LDxCYlgyXTUNLR0kfUQANkDye0Hox0tTGzd-Wx8-BGNB8n6JoLdTfw8PR0d7BKTG1JaMqlp6JkL2Tlzi0uEAWVQAa2lcVFJpRUZZRjriVD4AAtIB11L9uroDAhDNEPOQZh57JMPIMbP1+vY5ogzDYrKYPGZHCiIpZIvsQMkmmlWmRTtkLqwrgUeDR+IIaEJHi8CFUaE8aNhMKyGLg8ARsHw+FVcKCutpIUZ7ItyFtzNZ+uNnI4sQgbPY3ORTP03PYbBFFqZLcZyZSjuk2pkzjlCg0Us17WQCHxsPQ2WUOQBlKoAIx+dVdVOODoIpGwL1ZADM8LJZeD5b0of4Ro5yI4NbYbDZTEjjFMdWjguj0W49aEa0abYd3TTHfTchG7S2vT7pCV2aJJNJtPUm9SMt3fQnGGBFBBU5p06BMzZduRpp4s-q0TZLN5fAFNirxh43JYSeiK423WOHXTzu3R1HPd7fX3-ZzntJefzBcLcKLcHFSVpQICBpQfa8nzqF9pAAN1QL4IHeCFek6NMeiXAJTGschjFPWx3A8bcth1DxgnsLM8P1DxLQoxEEkSEABXoeBeltZsTiye9LnyG5WTfWhyAASQgRQwHnFDMIQFYdViHN8UCIidl3Uxxn6K9Iw9VtuMZXjCludlyAAEUYWAJEUVAxFyf4gUgIh3k+b5fhjbB0FICTFz6aTLB1PDcVUi0HEtKYlXiRj2JvWkuOdXTrn0-i7hoYzTPMyy+PgxCZHkJQXLcjyMK8mT9wQfVgiNEZrFJMIJhsDTO04p0GTyOKWT9QSTLMiyrMKb8BSFGR-zFWM8tQsEFwKqEivmQs4VMGtTzzNxjWWuqONvaKmqZPi2qSjrUu61g5AURQilgLKJFIMQCAQhh3NGuUJsQNwDX8QslVsbDCzPPd5hNA0jRWIKdiJPNVsi7SYua5kigS9l8oVErglevVXCLAtvp1ZxDRRJwLxqtxHDBqC70hjs1ufHsduSzq0pdR8tLYKpJTgWAEyqE7iGqWpctgO7VDGySvP8TZLHIKZHFUsiFMWnUlXk-oyMUolLHsSxCfC+mWxJpqyfBide0S4SaAyxhCCTXBZHIABhSnTPOy74YzLD+gsAk0VPJTpmMbVirsCxheMUtTSLSYTSJrTtYgzSuxgqmhONhDTYIc3LZt307eYE253u9CEf8I1XdLY1dxXL2fd+-P4TVwYJncCIaPDrWNqj+ro1jgSkvjrPk+TcgAFU+T6v8AKAqViEIMCmqz5DPLQ8a84LlUi490uInLgZ-H6KvVaLCWdhdsKDkgiPm7p4+Y8pjuje7lPHak-PQiX92S8cMvZaLeFN7CGwUQ92xG4am2M+0dxzt0NiIOMtACDTw+NnfmD086vQNI4FG2xEQ-1LOvBAuwcwEhwUtTw0R1Ia3PoAnSI5SFt0volO+QsIjBBQUqNBpo3ZYNLBYAKKDSSkitKYABDpaFQhhC7KuiJkSonRJiYqhhRbWGwsvVWqszz7wYnEIAA */
    createMachine(
        {
            context: {
                email: 'devessier@devessier.fr',
                hasReachedRateLimit: false,
                hasUnknownErrorOccured: false,
                passwordResetCode: undefined,
                hasUnknownErrorOccuredDuringPasswordResetCodeValidation: false,
            },
            schema: {
                context: {} as {
                    email: string;
                    hasReachedRateLimit: boolean;
                    hasUnknownErrorOccured: boolean;
                    passwordResetCode: string | undefined;
                    hasUnknownErrorOccuredDuringPasswordResetCodeValidation: boolean;
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
                      }
                    | {
                          type: 'Type on password reset code field';
                          code: string;
                      }
                    | {
                          type: 'Make unknown error occur during password reset code validation';
                      }
                    | {
                          type: 'Submit password reset token form';
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
                                target: '#Password reset.Rendering password reset code screen.Displaying password reset successful request toast',
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
                'Rendering password reset code screen': {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await waitFor(() => {
                                const passwordResetCodeScreenContainer =
                                    screen.getByTestId(
                                        'password-reset-confirmation-token-screen-container',
                                    );
                                expect(
                                    passwordResetCodeScreenContainer,
                                ).toBeTruthy();
                            });
                        },
                    },
                    initial:
                        'Displaying password reset successful request toast',
                    states: {
                        /**
                         * When the user requests a password reset, we display a success toast
                         * and we redirect her to "password reset code screen".
                         *
                         * In the state bellow we check that the toast has been displayed,
                         * and in its parent (meta.test above), we check that we are on password reset code screen.
                         */
                        'Displaying password reset successful request toast': {
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
                        'Invalid form': {
                            initial: 'Code is empty',
                            states: {
                                'Code is empty': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            await waitFor(() => {
                                                const passwordResetConfirmationCodeField =
                                                    screen.getByTestId(
                                                        'password-reset-confirmation-code-field',
                                                    );
                                                expect(
                                                    passwordResetConfirmationCodeField,
                                                ).toBeTruthy();

                                                const alert = within(
                                                    passwordResetConfirmationCodeField,
                                                ).getByRole('alert');
                                                expect(alert).toBeTruthy();

                                                expect(alert).toHaveTextContent(
                                                    'This field is required',
                                                );
                                            });
                                        },
                                    },
                                },
                                'Code is invalid': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            await waitFor(() => {
                                                const passwordResetConfirmationCodeField =
                                                    screen.getByTestId(
                                                        'password-reset-confirmation-code-field',
                                                    );
                                                expect(
                                                    passwordResetConfirmationCodeField,
                                                ).toBeTruthy();

                                                const alert = within(
                                                    passwordResetConfirmationCodeField,
                                                ).getByRole('alert');
                                                expect(alert).toBeTruthy();

                                                expect(alert).toHaveTextContent(
                                                    'Code is invalid.',
                                                );
                                            });
                                        },
                                    },
                                },
                                'Unknown error occured during validation': {
                                    meta: {
                                        test: async () => {
                                            await waitFor(() => {
                                                expect(
                                                    Toast.show,
                                                ).toHaveBeenCalledWith({
                                                    type: 'error',
                                                    text1: 'Validation of the code failed',
                                                    text2: expect.any(String),
                                                });
                                            });
                                        },
                                    },
                                },
                            },
                        },
                        'Token validated': {
                            type: 'final',
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'success',
                                                text1: 'Confirmed validity of the code',
                                            },
                                        );
                                    });
                                },
                            },
                        },
                    },
                    on: {
                        'Submit password reset token form': [
                            {
                                cond: 'Is code empty',
                                target: '.Invalid form.Code is empty',
                            },
                            {
                                cond: 'Is code invalid',
                                target: '.Invalid form.Code is invalid',
                            },
                            {
                                cond: 'Has unknown error occured during token validation',
                                target: '.Invalid form.Unknown error occured during validation',
                            },
                            {
                                target: '.Token validated',
                            },
                        ],
                        'Type on password reset code field': {
                            actions: 'Assign password reset code to context',
                        },
                        'Make unknown error occur during password reset code validation':
                            {
                                actions:
                                    'Assign unknown error occured during password reset code validation to context',
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

                'Is code empty': (context) => context.passwordResetCode === '',

                'Is code invalid': (context) =>
                    context.passwordResetCode !== VALID_PASSWORD_RESET_CODE,

                'Has unknown error occured during token validation': (
                    context,
                ) =>
                    context.hasUnknownErrorOccuredDuringPasswordResetCodeValidation ===
                    true,
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

                'Assign password reset code to context': assign({
                    passwordResetCode: (_context, event) => {
                        assertEventType(
                            event,
                            'Type on password reset code field',
                        );

                        return event.code;
                    },
                }),

                'Assign unknown error occured during password reset code validation to context':
                    assign({
                        hasUnknownErrorOccuredDuringPasswordResetCodeValidation:
                            (_context) => true,
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

    'Type on password reset code field': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof passwordResetMachine,
            'Type on password reset code field'
        >;

        const passwordResetConfirmationCodeField = await screen.findByTestId(
            'password-reset-confirmation-code-field',
        );
        expect(passwordResetConfirmationCodeField).toBeTruthy();

        const passwordResetCodeTextField = within(
            passwordResetConfirmationCodeField,
        ).getByPlaceholderText(/enter.*confirmation.*code/i);
        expect(passwordResetCodeTextField).toBeTruthy();

        fireEvent.changeText(passwordResetCodeTextField, event.code);
    },

    'Submit password reset token form': async ({ screen }) => {
        const passwordResetCodeScreenContainer = await screen.findByTestId(
            'password-reset-confirmation-token-screen-container',
        );
        expect(passwordResetCodeScreenContainer).toBeTruthy();

        const submitPasswordResetCodeFormButton = within(
            passwordResetCodeScreenContainer,
        ).getByText(/submit/i);
        expect(submitPasswordResetCodeFormButton).toBeTruthy();

        fireEvent.press(submitPasswordResetCodeFormButton);
    },

    'Make unknown error occur during password reset code validation': () => {
        server.use(
            rest.post<
                ValidatePasswordResetTokenRequestBody,
                never,
                ValidatePasswordResetTokenResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/validate-password-reset-token`,
                (_req, res, ctx) => {
                    return res(ctx.status(500));
                },
            ),
        );
    },
});

const existingUser = generateAuthenticationUser();

cases<{
    target:
        | {
              'Rendering signing in screen':
                  | 'Displaying reached rate limit toast'
                  | 'Displaying invalid email toast'
                  | 'Displaying unknown error toast'
                  | 'Displaying email is empty alert';
          }
        | {
              'Rendering password reset code screen': 'Displaying password reset successful request toast';
          };
    events: EventFrom<typeof passwordResetMachine>[];
}>(
    'Request password reset',
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
                'Rendering password reset code screen':
                    'Displaying password reset successful request toast',
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
        'Users can request a password reset several times': {
            target: {
                'Rendering password reset code screen':
                    'Displaying password reset successful request toast',
            },
            events: [
                {
                    type: 'Type email',
                    email: '',
                },
                {
                    type: 'Request password reset',
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

cases<{
    target: {
        'Rendering password reset code screen':
            | 'Displaying password reset successful request toast'
            | {
                  'Invalid form':
                      | 'Code is empty'
                      | 'Code is invalid'
                      | 'Unknown error occured during validation';
              }
            | 'Token validated';
    };
    events: EventFrom<typeof passwordResetMachine>[];
}>(
    'Validate password reset token',
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
        'Displays alert when code is empty': {
            target: {
                'Rendering password reset code screen': {
                    'Invalid form': 'Code is empty',
                },
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: '',
                },
                {
                    type: 'Submit password reset token form',
                },
            ],
        },

        'Displays alert when code is invalid': {
            target: {
                'Rendering password reset code screen': {
                    'Invalid form': 'Code is invalid',
                },
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: '--INVALID TOKEN--',
                },
                {
                    type: 'Submit password reset token form',
                },
            ],
        },

        'Shows error toast when an unknown error occurs during password reset code validation':
            {
                target: {
                    'Rendering password reset code screen': {
                        'Invalid form':
                            'Unknown error occured during validation',
                    },
                },
                events: [
                    {
                        type: 'Type email',
                        email: existingUser.email,
                    },
                    {
                        type: 'Request password reset',
                    },
                    {
                        type: 'Make unknown error occur during password reset code validation',
                    },
                    {
                        type: 'Type on password reset code field',
                        code: VALID_PASSWORD_RESET_CODE,
                    },
                    {
                        type: 'Submit password reset token form',
                    },
                ],
            },

        'Shows success toast when valid password reset code is provided': {
            target: {
                'Rendering password reset code screen': 'Token validated',
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: VALID_PASSWORD_RESET_CODE,
                },
                {
                    type: 'Submit password reset token form',
                },
            ],
        },
    },
);
