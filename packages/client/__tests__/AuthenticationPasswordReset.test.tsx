import { assign, createMachine, EventFrom } from 'xstate';
import { createModel as createTestModel } from '@xstate/test';
import cases from 'jest-in-case';
import Toast from 'react-native-toast-message';
import { rest } from 'msw';
import {
    RequestPasswordResetRequestBody,
    RequestPasswordResetResponseBody,
    ResetPasswordRequestBody,
    ResetPasswordResponseBody,
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
const CURRENT_PASSWORD = 'qwerty';

const passwordResetMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QAUCGtYHcD2AnCABLnGAC4B0ASmAHYRi4CWNUBsjUNzrzbAxsVoBiACoBPAA5gCYALapGAG0SgJ2dqUbYaKkAA9EAdgBsAJnKmAzAFYADLYAsATksOz1hwBoQYo2fIAHNaWpqbOxgCMprZOpgC+cd5oGDj4RCQU1HQM3GwcXCwEvLACYMLUAI4ArnCkBBLoWHiExLBkumoaWjpI+ogAtJZOEeQx1hHGkQ62lgGmE96+CAET5CZhpoZzJgEBhglJjaktGVS09EyF7Jy5xaXCALKoANbSuKik0oqMsox1xKg+AALSAddR-bq6AwIabWcjjWKGEIRWa2axOayLRAREyWciTezGJwxCLjUIHEDJJppVpkM7ZS6sa4FHg0fiCGhCJ6vAhVGjPGjYTBshi4PAEbB8PhVXBgrraKGIByrJEBByo4kYwy2YxYhATEz4gLGVwRCaI4wUqnHdJtTLnHKFBopZq2sgEPjYejssqcgDKVQARr86s7qSc7QRSNhXmyAGZ4WRyiEK3rQiK2cwrJzGNEOUIBTOGLw+RDzfzo6b5nMOPb7RKUo6u2n2hm5MM2lser3SEoc0SSaTaepNmkZbveuOMMCKCDJzSp0DQ-MOQLWAKWQzWQyhLcm3Wl-VBAL4yyzMzH6xX+IN63N05ZC7t0cR92e71931cl7SPkCoUirgYq4BKUoygQEAys+LpjpG77SAAbqg3wQB8kK9J0KY9EuZY6qMEQONuVhbDsG56qYV54rYBEREEIS2BuN6HDBr6tk+Tovm6dRTjQyE+sIAbBn8I4sVxBA8XxCa4EmGHggu2F9Ee4zkDimazARcwRE4ATkRp5AhLmxiEbm65OPWzHhlx9LsawHb3pGEmKPxnLiFIEpsjQYCYCJllTjOc6yfKCnQqEDirh4O4IrRVgYnqEzWMY5CEa49hzGqlq3pxLbWY6tlZeOjnOd+PJ2bB7rENUtTiQoyiBVhir6glJ5DCEWwosY1hWDph4TJYtgqRmtbKgxphOOqVr5XaOWMj5nYFcwfGfo8P7djQU7SWhw7wTIegSIwxABaocnoThCAUR4+kOFsnWGMScxOHFSKrpYHWkkEmZquuCQNoK9DwL0d5lWxuV5DchR3By5AAJIQIoYDzidin9M4q7TCayqdVesJ6kSTjkLEjjGBu66hNpE2idlj4g8ytxsktNDkAAIowsASIoqBiLkALApARAfF8PzCdG6CkAji6KRR5hjQaGx7Dq3VLBm9hrDEMQ5jMjjkplFMPg6M00+DdP3AzzOs+znOG0hKEyPIShRtgIti8FZbahYUQhMSZgmgsh4uCMG7GmN24vS91jk5ZlN67kBuss5TMs2zHO5H+grCjIQHisLsCi3V8kNaY-gbpENhuNRVglorthIklVeZtRBHUXs4dzVNVP6-ktNx6bicW6wcg1UUsA2xIpBiAQyEMDnR1BfnHX6Qlr1bLWhhbnqxp4h4hHqkEpi7OZjY663UdXB3htdwn5vQRH47MFbjCENtWdTyAmF52mZY4vjK-B09YVooYcUCJwhsH1eYtEQjjGbvZOkbdo6n1jvTJ2DV+jjBPGjU0mMPBohxgRfGFEq6jTNEZJwTgoFA2mlfFub4eznzNknDih93SwCqFKOAsA4xVCchVGo2d7aO1zojdMsw1ggJ3DqZUBdLDkRiBvbSkwjLTHXmQ1iFCGHXzgjQ+m0MaB30IFJWQ5AADCNCWbD1Hkg9+CAjInm1PYW6YQthzArmWAueMPBDAomqAIwww7a3UTA4+eVGF1G2loqGOjkL33EomIxJih630iYdF+x1xbQiRHiLSrgdxWBemqciZ4TzBBcGpHcsQXDKKsrAtRVCQmaONto3R0TpLkAAKr8lToBYCoFpQHQglBQoujNoKVfoIxARk8S2KrrEK6uwwjkWmIYeEWTaxDDMlqCpkc2zVOgbUj89TwmNP0RY06kQ8aTPsTMpxukczwlrJEMIxgtxFw2brLZQT-G7N7PUkQMZaAEEGZ8JJIzUllm3PCY0HUrB2A8A46RYR8QzFCI4FEJDHkvKPm82aOyJxfI5McxSWxAhaRMvmXeRZnH6hcHjXMJgF7nW0pYdFATMWlVYuJBaTkwmw3hgIkF+ptQnliGeLqDFbo+0VhiPGOYiRV29qNLYTLgYzVZWJQqWju6X22UDe2sZ-mJP5kClJzt9RuDhPYG6BphgYlMLpZUgRogTHzFXWsV5FWqPeTU9lvFOX7IidbfR5AAByXksVpFMXIEeSxp71UsZIjeRJpjzCwZmTEh5QjRBUlajwJDlSETdVUj12K1W+sOTE4N3kVWmNgKgWQ0h0AehlMQGgdRtA8ujW-U6cb8YohepMdUhFYppt3njWixZqKZgzINfNgTQ1suLZDA5iSmkGLaf+NOopxSSh6bzSCM1uG1HxSFC88IE0TuTRRfJ64VLbDNLY+YQRp0ssmu6edvoGlLqOby41BdHAnrGme6YKbbWLOJUZCYUQVgOEfTZWdqqOXOUPdiMKIxzWbEtVpTqcU9irjMiibe+ZvGxGgyDIE2Ba0Ia-Q1YYhSIMkNiHYF6FLh2JUech9GNhR2KsQwgFB+Ya7o1JOdbGh4PAjDKR1FYu9IiGAiN9OIQA */
    createMachine(
        {
            context: {
                email: 'devessier@devessier.fr',
                hasReachedRateLimit: false,
                hasUnknownErrorOccured: false,
                passwordResetCode: undefined,
                isPasswordResetCodeExpired: false,
                hasUnknownErrorOccuredDuringPasswordResetCodeValidation: false,
                newPassword: '',
                hasUnknownErrorOccuredDuringPasswordReset: false,
            },
            schema: {
                context: {} as {
                    email: string;
                    hasReachedRateLimit: boolean;
                    hasUnknownErrorOccured: boolean;
                    passwordResetCode: string | undefined;
                    isPasswordResetCodeExpired: boolean;
                    hasUnknownErrorOccuredDuringPasswordResetCodeValidation: boolean;
                    newPassword: string;
                    hasUnknownErrorOccuredDuringPasswordReset: boolean;
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
                      }
                    | {
                          type: 'Submit password reset final form';
                      }
                    | {
                          type: 'Make confirmation code expired';
                      }
                    | {
                          type: 'Type on new password field';
                          newPassword: string;
                      }
                    | {
                          type: 'Make password reset request fail';
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
                        'Displaying password reset invalid code toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'error',
                                                text1: 'Changing password failed',
                                                text2: expect.stringMatching(
                                                    /confirmation.*code.*expired/i,
                                                ),
                                            },
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
                                target: '#Password reset.Rendering password reset final screen.Displaying password reset token validated',
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
                'Rendering password reset final screen': {
                    initial: 'Idle',
                    states: {
                        Idle: {},
                        'Displaying password reset token validated': {
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
                        'Invalid form': {
                            initial: 'New password is empty',
                            states: {
                                'New password is empty': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            await waitFor(() => {
                                                const passwordResetNewPasswordField =
                                                    screen.getByTestId(
                                                        'password-reset-new-password-field',
                                                    );
                                                expect(
                                                    passwordResetNewPasswordField,
                                                ).toBeTruthy();

                                                const alert = within(
                                                    passwordResetNewPasswordField,
                                                ).getByRole('alert');
                                                expect(alert).toBeTruthy();

                                                expect(alert).toHaveTextContent(
                                                    'This field is required',
                                                );
                                            });
                                        },
                                    },
                                },
                                'New password is same as current one': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            await waitFor(() => {
                                                const passwordResetNewPasswordField =
                                                    screen.getByTestId(
                                                        'password-reset-new-password-field',
                                                    );
                                                expect(
                                                    passwordResetNewPasswordField,
                                                ).toBeTruthy();

                                                const alert = within(
                                                    passwordResetNewPasswordField,
                                                ).getByRole('alert');
                                                expect(alert).toBeTruthy();

                                                expect(alert).toHaveTextContent(
                                                    'New password must be different than old password.',
                                                );
                                            });
                                        },
                                    },
                                },
                                'Unknown error occured during request': {
                                    meta: {
                                        test: async () => {
                                            await waitFor(() => {
                                                expect(
                                                    Toast.show,
                                                ).toHaveBeenCalledWith({
                                                    type: 'error',
                                                    text1: 'Changing password failed',
                                                    text2: expect.stringMatching(
                                                        /unknown.*error.*try.*again/i,
                                                    ),
                                                });
                                            });
                                        },
                                    },
                                },
                            },
                        },
                    },
                    on: {
                        'Submit password reset final form': [
                            {
                                cond: 'Is new password empty',
                                target: '.Invalid form.New password is empty',
                            },
                            {
                                cond: 'Is new password same as current one',
                                target: '.Invalid form.New password is same as current one',
                            },
                            {
                                cond: 'Has unknown error occured during password reset request',
                                target: '.Invalid form.Unknown error occured during request',
                            },
                            {
                                cond: 'Is code invalid',
                                target: '#Password reset.Rendering signing in screen.Displaying password reset invalid code toast',
                            },
                            {
                                target: 'Rendering home screen',
                            },
                        ],
                        'Type on new password field': {
                            actions: 'Assign new password to context',
                        },
                        'Make password reset request fail': {
                            actions:
                                'Assign unknown error occured during password reset request to context',
                        },
                        'Make confirmation code expired': {
                            actions:
                                'Assign password reset code has expired to context',
                        },
                    },
                },
                'Rendering home screen': {
                    type: 'final',
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await Promise.all([
                                waitFor(() => {
                                    expect(Toast.show).toHaveBeenCalledWith({
                                        type: 'success',
                                        text1: 'Password changed successfully',
                                    });
                                }),

                                waitFor(() => {
                                    expect(
                                        screen.getAllByText(/home/i).length,
                                    ).toBeGreaterThanOrEqual(1);
                                }),
                            ]);
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

                'Is code invalid': ({
                    isPasswordResetCodeExpired,
                    passwordResetCode,
                }) => {
                    if (isPasswordResetCodeExpired === true) {
                        return true;
                    }

                    return passwordResetCode !== VALID_PASSWORD_RESET_CODE;
                },

                'Has unknown error occured during token validation': (
                    context,
                ) =>
                    context.hasUnknownErrorOccuredDuringPasswordResetCodeValidation ===
                    true,

                'Is new password empty': ({ newPassword }) =>
                    newPassword === '',

                'Is new password same as current one': ({ newPassword }) =>
                    newPassword === CURRENT_PASSWORD,

                'Has unknown error occured during password reset request': ({
                    hasUnknownErrorOccuredDuringPasswordReset,
                }) => hasUnknownErrorOccuredDuringPasswordReset === true,
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

                'Assign password reset code has expired to context': assign({
                    isPasswordResetCodeExpired: (_context) => true,
                }),

                'Assign new password to context': assign({
                    newPassword: (_context, event) => {
                        assertEventType(event, 'Type on new password field');

                        return event.newPassword;
                    },
                }),

                'Assign unknown error occured during password reset request to context':
                    assign({
                        hasUnknownErrorOccuredDuringPasswordReset: (_context) =>
                            true,
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

    'Submit password reset final form': async ({ screen }) => {
        const passwordResetNewPasswordScreenContainer =
            await screen.findByTestId(
                'password-reset-new-password-screen-container',
            );
        expect(passwordResetNewPasswordScreenContainer).toBeTruthy();

        const submitPasswordResetNewPasswordFormButton = within(
            passwordResetNewPasswordScreenContainer,
        ).getByText(/^submit$/i);
        expect(submitPasswordResetNewPasswordFormButton).toBeTruthy();

        fireEvent.press(submitPasswordResetNewPasswordFormButton);
    },

    'Type on new password field': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof passwordResetMachine,
            'Type on new password field'
        >;

        const passwordResetNewPasswordScreenContainer =
            await screen.findByTestId(
                'password-reset-new-password-screen-container',
            );
        expect(passwordResetNewPasswordScreenContainer).toBeTruthy();

        const newPasswordField = await within(
            passwordResetNewPasswordScreenContainer,
        ).findByPlaceholderText(/new.*password/i);
        expect(newPasswordField).toBeTruthy();

        fireEvent.changeText(newPasswordField, event.newPassword);
    },

    'Make password reset request fail': () => {
        server.use(
            rest.post<
                ResetPasswordRequestBody,
                never,
                ResetPasswordResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/reset-password`,
                (_req, res, ctx) => {
                    return res(ctx.status(500));
                },
            ),
        );
    },

    'Make confirmation code expired': () => {
        server.use(
            rest.post<
                ResetPasswordRequestBody,
                never,
                ResetPasswordResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/reset-password`,
                (_req, res, ctx) => {
                    return res(
                        ctx.status(400),
                        ctx.json({
                            status: 'INVALID_TOKEN',
                        }),
                    );
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
    target:
        | {
              'Rendering password reset code screen':
                  | 'Displaying password reset successful request toast'
                  | {
                        'Invalid form':
                            | 'Code is empty'
                            | 'Code is invalid'
                            | 'Unknown error occured during validation';
                    };
          }
        | {
              'Rendering password reset final screen': 'Displaying password reset token validated';
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
                'Rendering password reset final screen':
                    'Displaying password reset token validated',
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

cases<{
    target:
        | {
              'Rendering password reset final screen':
                  | 'Displaying password reset token validated'
                  | {
                        'Invalid form':
                            | 'New password is empty'
                            | 'New password is same as current one'
                            | 'Unknown error occured during request';
                    };
          }
        | 'Rendering home screen'
        | {
              'Rendering signing in screen': 'Displaying password reset invalid code toast';
          };
    events: EventFrom<typeof passwordResetMachine>[];
}>(
    'Sets a new password',
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
        'Displays alert when new password is empty': {
            target: {
                'Rendering password reset final screen': {
                    'Invalid form': 'New password is empty',
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
                    code: '123456',
                },
                {
                    type: 'Submit password reset token form',
                },
                {
                    type: 'Submit password reset final form',
                },
            ],
        },

        'Displays alert when new password is same as current one': {
            target: {
                'Rendering password reset final screen': {
                    'Invalid form': 'New password is same as current one',
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
                    code: '123456',
                },
                {
                    type: 'Submit password reset token form',
                },
                {
                    type: 'Type on new password field',
                    newPassword: CURRENT_PASSWORD,
                },
                {
                    type: 'Submit password reset final form',
                },
            ],
        },

        'Displays error toast when an error occured during request': {
            target: {
                'Rendering password reset final screen': {
                    'Invalid form': 'Unknown error occured during request',
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
                    code: '123456',
                },
                {
                    type: 'Submit password reset token form',
                },
                {
                    type: 'Make password reset request fail',
                },
                {
                    type: 'Type on new password field',
                    newPassword: 'new password',
                },
                {
                    type: 'Submit password reset final form',
                },
            ],
        },

        'Redirects to signing in screen when token has expired': {
            target: {
                'Rendering signing in screen':
                    'Displaying password reset invalid code toast',
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
                    code: '123456',
                },
                {
                    type: 'Submit password reset token form',
                },
                {
                    type: 'Make confirmation code expired',
                },
                {
                    type: 'Type on new password field',
                    newPassword: 'new password',
                },
                {
                    type: 'Submit password reset final form',
                },
            ],
        },

        'Redirects to home screen and authenticates the user when password reset succeeds':
            {
                target: 'Rendering home screen',
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
                        code: '123456',
                    },
                    {
                        type: 'Submit password reset token form',
                    },
                    {
                        type: 'Type on new password field',
                        newPassword: 'new password',
                    },
                    {
                        type: 'Submit password reset final form',
                    },
                ],
            },
    },
);
