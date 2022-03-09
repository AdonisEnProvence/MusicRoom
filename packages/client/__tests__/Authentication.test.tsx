import AsyncStorage from '@react-native-async-storage/async-storage';
import { createModel } from '@xstate/test';
import cases from 'jest-in-case';
import invariant from 'tiny-invariant';
import { createMachine, assign, EventFrom } from 'xstate';
import * as z from 'zod';
import { assertEventType } from '../machines/utils';
import { db, generateAuthenticationUser } from '../tests/data';
import {
    render,
    renderApp,
    renderUnauthenticatedApp,
    waitFor,
    within,
    fireEvent,
} from '../tests/tests-utils';

interface TestingContext {
    screen?: ReturnType<typeof render>;
}

const existingUser = generateAuthenticationUser();

const authenticationModelMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QEECuAXAFmAduglgMYCGBA9jgAQC2ZEYANgHQCSO+BxD+AXqfhQDEAWWIBrMJVSwwAJ0rEM2PEVKQFOCJVm5684gAcD3EuRyJQBsrA4DzSEAA9EAZgCsATiYBGAOy+XADYAJhcAFmCwgAZAqN8AGhAAT0QAWl8fDw8ADm9ctzdfDxCPMIBfMsS0LFwCUzsaOkZWdk5uPjMRcUlpOSkcRRqVU3ViTW1dPsNjVTMLECsbOYdnBFTvYK9stxcPfzco7Oywo8DElIRgtzCmaPCXbJcnk+Ds4IqqpVrZhtp6ZgASpNZPgcFBKDYoOwwRDCDpcEwAGL4BjcGFwyDfLiwJEotHggBm+EYEBxyNRoPBYGoxBRggAyqgAEbUDgQ-BQymUUGUAlkWTUeaLWwUearbzeFxMB5RYKBMIeGK7bIec6IbxuR5MKIPDzBXy5bJRNwhD4garKOr8CiNf5MIGaORcyHQ8GwDEI8n4ygY+gqbG4ikwokksl4rnU2kMQQAFSSBkkNpdXJ5kZRvOJDAgQusIvsoFWHm8gSYgV2cV1gVikrVCGLcqYvjCmsCbjlRzybjNFu+9Rtf2aDr0zo5rth8Jwge9vqxDDDQcJmdJU65BmIsFgAHd+RAGczWeh2ZyYTy+QKc0s7GL1Q3JWFYr4q9lH7LgrXgvq3EwTa9coFn74OzlJU5pfMM1pUAOgLAiOx5uh6k5elyM7+nOK7Bku87emuG7brIu5xgmlBJqOKZUDhW47hmJIXnm14IB4bjeKWAQqh4Ty-oE3jvu42TfmELiPsceq7O8IE9uBZi2oOMEwsmckIeh4IoW0WFciGWawIIEAUGATCwOgahMBJVpSVB9qyW6pEKROSk+jofqqXZGmkrRywFuquxSjkvGbAaeSAbWeStkwxxMfKvjFhqoTdmBpm-E00GOiCcnWfBtlIeiDmzmpGGhl0EhHmOPI6AAjqgcCHgSUZuVeKyeVk2oHOxxSBAE-hBQJX7eBW7Emi4kSvLFQzxf2iUWclsFju6tlDk6clyAAbn0ciyPye4smy8ngqe-KCg4wruU4rhRMxWRZLKvHbD1bi1oUZ2eAc3jRG8gHDZaPxjXac0pVZcHjmAuDabp+mGegekmZ9kHjT9U3OghtWivVDGytKxpHJ4RxNrdySIMExqlhq8oqs8kSMe9vYQdJSXDql-0zYDOCCAAqjI8gGDoG7qFAZCUOgvMulIBi8ntAO4Ij+bHWsGyhfKrwBMWKoBGcuOXP+Jaar4H743sGpduJcVQ9TE2039Y6oMLDOeuGWWYqhuXgr08jsIQYgDNQYAbQeBB0+bwtnvtli5kdqzNnxz2CQqxp+M92S1i4EpREwcqPnqAlGmEj4U5JCXfZZRVchbYuITbynZfbdlO5QLtu8QHuxvGiZUNtQtSGz1dELXHvUVmEv0RjtwDVW7YPkE8fPUnBRBGEEStjqgTZ6N0N55NvuF5bimZWXdtOUSC5t30FF4bujKbegPtm+vIvngdwd1R5CACUnRTZK2Ov-pKxa1hEirSuF2w6kVG9A2I0jbmVhmvGERcrYl33ipfAAY97eirkfHcDciIkX+kXFB65KL4R7tmW+l4kYP22CWPY2M4iamKPqb+QQvz6m8IqHq0RSjeEXmAmG+cW7QM3qXeyO8EFoSQYXduaZoyn29nDKB-s9p92RjPYI2o2rPT8H1HYxR47yi2JqTY-4rgBEiBwvsy8ZKr0vjI4udl4GIP4VXcR6Cm4F0sfYmk6YXLyIfkWJR8oHiPGCEwzY8cAheCEuEDYuwmJ5GMVTcB3C0qtxgdY8uqlgY4D0gZIykMTHGwgRYx2G8Mr8JsXOTxUtJRGlLMaIsTE4ihGuMEw4jYNT3ieAaIIVwKggRwE0eADhsmxPGmwWwXBeAQTKaHZiQk3h7FbH4K4YRaxeEOEaV4T9iyZwKDEsyXDzGUEwGQbuMCJnqlOkow095AjFFfO4WsqQQr+R6lrLICp+rbNzmY02zj0qM2SYIgMW8CEO0oOI1gEAGBgBOXWU6Pgrn5HcCaUorxOpVlCoBVqJxXzAU+KAnJcS9ktySYCkpwKXLAtBWwRaoyIBMAAKJuIYNyWAILqAGHQBcIOxDJarFiCWdwkU3hRAVNEQ4QV5RJyfPeGe0RXhiRxR9PFuyvmEr4XAlJQjSWYTshSnAVLuA0vpVGJl3JdXUqhbEL8bUXBRDiLKI4pQcYXBjnxIoTwlRcV8MabFoFcWDJXsqhJRLinqoBfwsl2qGUtD1fgQhnK6LI01MxK1NrPW-gdUFE0GQrmRQKIqa1Yd3lfU+fNfJVjiUhrQoC8NgLQUADUzVEPjQ-TU3UFR7E2BKE0KsnVGhLFrK4jFPCHEzoW0xNMS3fLLcG-5law1aprQyqF-hYU5A1Aiq5EQ46qwqWdIVrYig-2fNkUduT4n01VdOCtmrQx2VQfhMFEKoXbG-PjB47gJSJ1bO+YsSc7VFhyNcHIzYT34oDeeopaqZ3Xs0re3Bx8o3UqYAABTg1RfAzLqRso5QsO+JCpYmiTZ6gIT8-GOrxpsJO0QmwUbarkEDSqJ0qog5eqDzl538LvTSylDa40h0QDsLNRH7g6gxu+AJGQBJcXxjsY0yt6P+sY4Gi9yEr1sZvYCzjTB636qhYUKU4RDgBKYUxAI74TjMRniqF4kVwjAPlZTHZCnfqTqDZBxyGq1MwY06h-C5rmJthE++j9MQyOXCoU1R8EoE7+BOPJ4tzmmO-PLaxqtmEoWCRfYFqJn7QuSiaexZ4pRZPhTi+OhLSnmMqZS3idQZKoXFmuLC64BQDhVkYi4IK9rQoCUiEJAJ2xSsm0U+BpL073PYnq1KALb7ss9TmUFepTBihMLyDa0odmfUKr9fF6RPyER5IhEtFasg1qyAfZCxtfGECARfao-YPUgjcVViaJO4QpWZ30ScBeICtuOZ25Avbk4Dts2WvIVa-ImAABF0PGGIEkEFJ3+RQqLBZmIhxPBVmuAaWs-4k79bXfavUcpBvA4q784HR2weI7O5Ijg4MtCwFQIQQgcBYAElQKibDh175S0Yl4XYexzoan8A8IKspJ7Wq4hatsD4SdnumopCnshQcI9O7p-zASwh+EAg9ri38buCQGv4OImPiguDlwSsn4tLs89WOsSjRQpcnCOCTBU39UbRCYVEdiACiMW7A37KdbmcqV3bjXd2ekWDgou7x23iBf6XLbSca4uxFmq2tU8aU-hvHsTlA8f3w3A+uZY+N2d+8q7h7rnpbTMb6vPuLANQobZjgSnjl5ZO4VPA9VKObn7DmPlld24k5TttS-Aor53CPCH9VMAAHKT6r8azD7L6s2tu8qWpngmyqnT8FRsmd2I5pta8fW9mc5FsHwD4flXR8h8BRP12U-uMz-n4-xf6H+jECpSiYgTJH027w3FDXzbElAAxuj2Dd3T1eClEikP0eEAjtQL3KywUKVG2DwrnvzDwXw9mn1rwAO5UQEfHXzAOqW33HklEbEfAeCbGbD3W+zPyXlPUtxQKDxLzvzsSwLfw9l0yURAI33ALINVk2BOFuBiFiAEkYhlSQKH14Rv23jHyYBESgXbk0yj3-1j0APjylGJlmV4m9zEO-k10JgVGfEOByH-GkKv1kLQLYIriUMdhUJ8xpRr1jRwy5XoieVuFAIJx1H1FyG-gx2lFmXqSuD8G9QGT+0v1LWsOtnQN3g4MPicNwJpRQ1wjQww1ZRX3wI8I1EoKYiAWqRnnCDoUYlLC71AMiCNF8EsOiNQNiNsPiPL0cLSPvWfxjWQycONU3DAHEHq1yPuwKM8CKLTwuBnj1FLGtSNAGgM3oM237wvyG2QKLxH3kJD3sIPnZiSLaNcO500IYimR10GNKAEhGMQB6x8SPWNGoPuhqMnRiNgQaI83WJwRaJ2NwwIIQDajyK909SGJOO-g2C8F8VowKDzzlTmPPzHUWJkLqIeKqwUOeLEUjTUJjzcKbSliKCW1fieFfkiBtVbFC0ewyB93-DaRBN7wYM4ScxhNYPhLWISLB0jRcKhSlR8DEI2Hxl8KOHd3xluEfCrEbz6gpIhMYNA0LyvmLzpLsIZJZSjGSLpQZSX0yK53ePokamNweAiEzhxJiGCXlCCMukF29yuFPxFKpP+1qNpNv2lKaJWmRNNRn0NXTA-1BGjTePcORkaiYlyGiBCDWTIXjjCmTjyHbCYhlEEluJ4VhL+QRJlJ1TdIVKNQ-1QAGG-wYF-3ULRKux6glUilCBCEjn-FfnjlzyWznkFU8FKEjISXuJjPpNtMZLlO2KXS-G9Inj9OOADPTyuQszyHYg2B2H-GKGrJYMlOtMaOQSRJqmyITX8zyHbI-E7JNHjh2CUWKHahOEiWFRHOWLkIETHyhX1G-HnN9MXOTzLHfGfC-C6gE1lHKOFIiIH2hKsOjPpBrNkQFAhH3Dp3UEZ2Z1Z3Z050mxnjKJyAunMK1gSHT2OBLGOH8CLPxhnkKB3IlIRhnIfimxPJiDPLIWRSENWVuF8Wd2LHa1KyhXWB2FCg0X2BWWd27TSAqUbDbC+xzJiBsy6TKCAA */
    createMachine(
        {
            context: {
                isSigningInRequestGoingToFail: false,
                signingInEmail: '',
                signingInPassword: '',
            },
            schema: {
                context: {} as {
                    isSigningInRequestGoingToFail: boolean;
                    signingInEmail: string;
                    signingInPassword: string;
                },
                events: {} as
                    | { type: 'Make user authenticated and render application' }
                    | {
                          type: 'Make user unauthenticated and render application';
                      }
                    | { type: 'Submit signing in form' }
                    | { type: 'Make signing in request fail' }
                    | { type: 'Type on signing in email field'; email: string }
                    | {
                          type: 'Type on signing in password field';
                          password: string;
                      }
                    | {
                          type: 'User pressed go to sign up form screen';
                      }
                    | {
                          type: 'Submitting signing up form';
                      }
                    | {
                          type: 'Type on signing up user nickname field';
                          nickname: string;
                      }
                    | {
                          type: 'Type on signing up user password field';
                          password: string;
                      }
                    | {
                          type: 'Type on signing up user email field';
                          email: string;
                      },
            },
            id: 'Authentication model',
            initial: 'Initialization',
            states: {
                Initialization: {
                    on: {
                        'Make user authenticated and render application': {
                            target: '#Authentication model.Rendering home screen',
                        },
                        'Make user unauthenticated and render application': {
                            target: '#Authentication model.Rendering signing screen',
                        },
                    },
                },
                'Rendering home screen': {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'Screen must have been rendered',
                            );

                            await waitFor(() => {
                                expect(
                                    screen.getAllByText(/home/i).length,
                                ).toBeGreaterThanOrEqual(1);
                            });
                        },
                    },
                },
                'Rendering signing screen': {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'Screen must have been rendered',
                            );

                            const signingInScreenTitle =
                                await screen.findByText(/welcome.*back/i);
                            expect(signingInScreenTitle).toBeTruthy();
                        },
                    },
                    type: 'parallel',
                    states: {
                        'Filling credentials': {
                            initial: 'Filling fields',
                            states: {
                                'Filling fields': {
                                    type: 'parallel',
                                    states: {
                                        'Filling email': {
                                            initial: 'Idle',
                                            states: {
                                                Idle: {
                                                    meta: {
                                                        test: async ({
                                                            screen,
                                                        }: TestingContext) => {
                                                            invariant(
                                                                screen !==
                                                                    undefined,
                                                                'Screen must have been rendered',
                                                            );

                                                            await waitFor(
                                                                () => {
                                                                    expect(
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'signing-in-screen-email-field',
                                                                            ),
                                                                        ).queryByRole(
                                                                            'alert',
                                                                        ),
                                                                    ).toBeNull();
                                                                },
                                                            );
                                                        },
                                                    },
                                                },
                                                Invalid: {
                                                    initial: 'Email is empty',
                                                    states: {
                                                        'Email is empty': {
                                                            meta: {
                                                                test: async ({
                                                                    screen,
                                                                }: TestingContext) => {
                                                                    invariant(
                                                                        screen !==
                                                                            undefined,
                                                                        'Screen must have been rendered',
                                                                    );

                                                                    await waitFor(
                                                                        () => {
                                                                            const emailIsEmptyAlert =
                                                                                within(
                                                                                    screen.getByTestId(
                                                                                        'signing-in-screen-email-field',
                                                                                    ),
                                                                                ).getByRole(
                                                                                    'alert',
                                                                                );
                                                                            expect(
                                                                                emailIsEmptyAlert,
                                                                            ).toBeTruthy();

                                                                            expect(
                                                                                emailIsEmptyAlert,
                                                                            ).toHaveTextContent(
                                                                                'This field is required',
                                                                            );
                                                                        },
                                                                    );
                                                                },
                                                            },
                                                        },
                                                        'Email is invalid': {
                                                            meta: {
                                                                test: async ({
                                                                    screen,
                                                                }: TestingContext) => {
                                                                    invariant(
                                                                        screen !==
                                                                            undefined,
                                                                        'Screen must have been rendered',
                                                                    );

                                                                    await waitFor(
                                                                        () => {
                                                                            const emailIsInvalidAlert =
                                                                                within(
                                                                                    screen.getByTestId(
                                                                                        'signing-in-screen-email-field',
                                                                                    ),
                                                                                ).getByRole(
                                                                                    'alert',
                                                                                );
                                                                            expect(
                                                                                emailIsInvalidAlert,
                                                                            ).toBeTruthy();

                                                                            expect(
                                                                                emailIsInvalidAlert,
                                                                            ).toHaveTextContent(
                                                                                'Not a well formed email address',
                                                                            );
                                                                        },
                                                                    );
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                                Valid: {
                                                    meta: {
                                                        test: async ({
                                                            screen,
                                                        }: TestingContext) => {
                                                            invariant(
                                                                screen !==
                                                                    undefined,
                                                                'Screen must have been rendered',
                                                            );

                                                            await waitFor(
                                                                () => {
                                                                    expect(
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'signing-in-screen-email-field',
                                                                            ),
                                                                        ).queryByRole(
                                                                            'alert',
                                                                        ),
                                                                    ).toBeNull();
                                                                },
                                                            );
                                                        },
                                                    },
                                                    type: 'final',
                                                },
                                            },
                                            on: {
                                                'Submit signing in form': [
                                                    {
                                                        cond: 'Signing in email is empty',
                                                        target: '#Authentication model.Rendering signing screen.Filling credentials.Filling fields.Filling email.Invalid.Email is empty',
                                                    },
                                                    {
                                                        cond: 'Signing in email is invalid',
                                                        target: '#Authentication model.Rendering signing screen.Filling credentials.Filling fields.Filling email.Invalid.Email is invalid',
                                                    },
                                                    {
                                                        target: '#Authentication model.Rendering signing screen.Filling credentials.Filling fields.Filling email.Valid',
                                                    },
                                                ],
                                                'Type on signing in email field':
                                                    {
                                                        actions:
                                                            'Assign signing in typed email to context',
                                                        target: '#Authentication model.Rendering signing screen.Filling credentials.Filling fields.Filling email',
                                                    },
                                            },
                                        },
                                        'Filling password': {
                                            initial: 'Idle',
                                            states: {
                                                Idle: {
                                                    meta: {
                                                        test: async ({
                                                            screen,
                                                        }: TestingContext) => {
                                                            invariant(
                                                                screen !==
                                                                    undefined,
                                                                'Screen must have been rendered',
                                                            );

                                                            await waitFor(
                                                                () => {
                                                                    expect(
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'signing-in-screen-password-field',
                                                                            ),
                                                                        ).queryByRole(
                                                                            'alert',
                                                                        ),
                                                                    ).toBeNull();
                                                                },
                                                            );
                                                        },
                                                    },
                                                },
                                                Invalid: {
                                                    initial:
                                                        'Password is empty',
                                                    states: {
                                                        'Password is empty': {
                                                            meta: {
                                                                test: async ({
                                                                    screen,
                                                                }: TestingContext) => {
                                                                    invariant(
                                                                        screen !==
                                                                            undefined,
                                                                        'Screen must have been rendered',
                                                                    );

                                                                    await waitFor(
                                                                        () => {
                                                                            const passwordIsEmptyAlert =
                                                                                within(
                                                                                    screen.getByTestId(
                                                                                        'signing-in-screen-password-field',
                                                                                    ),
                                                                                ).getByRole(
                                                                                    'alert',
                                                                                );
                                                                            expect(
                                                                                passwordIsEmptyAlert,
                                                                            ).toBeTruthy();

                                                                            expect(
                                                                                passwordIsEmptyAlert,
                                                                            ).toHaveTextContent(
                                                                                'This field is required',
                                                                            );
                                                                        },
                                                                    );
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                                Valid: {
                                                    meta: {
                                                        test: async ({
                                                            screen,
                                                        }: TestingContext) => {
                                                            invariant(
                                                                screen !==
                                                                    undefined,
                                                                'Screen must have been rendered',
                                                            );

                                                            await waitFor(
                                                                () => {
                                                                    expect(
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'signing-in-screen-password-field',
                                                                            ),
                                                                        ).queryByRole(
                                                                            'alert',
                                                                        ),
                                                                    ).toBeNull();
                                                                },
                                                            );
                                                        },
                                                    },
                                                    type: 'final',
                                                },
                                            },
                                            on: {
                                                'Submit signing in form': [
                                                    {
                                                        cond: 'Signing in password is empty',
                                                        target: '#Authentication model.Rendering signing screen.Filling credentials.Filling fields.Filling password.Invalid.Password is empty',
                                                    },
                                                    {
                                                        target: '#Authentication model.Rendering signing screen.Filling credentials.Filling fields.Filling password.Valid',
                                                    },
                                                ],
                                                'Type on signing in password field':
                                                    {
                                                        actions:
                                                            'Assign signing in typed password to context',
                                                        target: '#Authentication model.Rendering signing screen.Filling credentials.Filling fields.Filling password',
                                                    },
                                            },
                                        },
                                    },
                                    on: {
                                        'Make signing in request fail': {
                                            actions:
                                                'Assign signing in request will fail to context',
                                            target: '#Authentication model.Rendering signing screen.Filling credentials.Filling fields',
                                        },
                                    },
                                    onDone: {
                                        target: '#Authentication model.Rendering signing screen.Filling credentials.Filled fields',
                                    },
                                },
                                'Filled fields': {
                                    type: 'final',
                                },
                            },
                        },
                        'Rendering server error': {
                            initial: 'Idle',
                            states: {
                                Idle: {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            invariant(
                                                screen !== undefined,
                                                'Screen must have been rendered',
                                            );

                                            await waitFor(() => {
                                                expect(
                                                    screen.queryByTestId(
                                                        'signing-in-screen-server-error',
                                                    ),
                                                ).toBeNull();
                                            });
                                        },
                                    },
                                },
                                'Display error': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            invariant(
                                                screen !== undefined,
                                                'Screen must have been rendered',
                                            );

                                            await waitFor(() => {
                                                const serverErrorAlert = within(
                                                    screen.getByTestId(
                                                        'signing-in-screen-server-error',
                                                    ),
                                                ).getByRole('alert');
                                                expect(
                                                    serverErrorAlert,
                                                ).toBeTruthy();

                                                expect(
                                                    serverErrorAlert,
                                                ).toHaveTextContent(
                                                    'Credentials are invalid',
                                                );
                                            });
                                        },
                                    },
                                },
                                'Submitted successfully': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            invariant(
                                                screen !== undefined,
                                                'Screen must have been rendered',
                                            );

                                            await waitFor(() => {
                                                expect(
                                                    screen.queryByTestId(
                                                        'signing-in-screen-server-error',
                                                    ),
                                                ).toBeNull();
                                            });
                                        },
                                    },
                                    type: 'final',
                                },
                            },
                            on: {
                                'Submit signing in form': [
                                    {
                                        cond: 'Signing in email is empty',
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Idle',
                                    },
                                    {
                                        cond: 'Signing in email is invalid',
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Idle',
                                    },
                                    {
                                        cond: 'Signing in password is empty',
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Idle',
                                    },
                                    {
                                        cond: 'Server returns an error for signing in request',
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Display error',
                                    },
                                    {
                                        cond: 'Credentials are invalid',
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Display error',
                                    },
                                    {
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Submitted successfully',
                                    },
                                ],
                            },
                        },
                    },
                    on: {
                        'User pressed go to sign up form screen': {
                            target: '#Authentication model.Rendering signing up screen',
                        },
                    },
                    onDone: {
                        target: '#Authentication model.Rendering home screen',
                    },
                },
                'Rendering signing up screen': {
                    initial: 'Filling credentials',
                    states: {
                        'Filling credentials': {
                            type: 'parallel',
                            states: {
                                'Filling user nickname': {
                                    initial: 'Idle',
                                    states: {
                                        Idle: {},
                                        Valid: {
                                            type: 'final',
                                        },
                                        Invalid: {
                                            initial: 'Nickname is empty',
                                            states: {
                                                'Nickname is empty': {},
                                                'Nickname is unavailable': {},
                                            },
                                        },
                                    },
                                    on: {
                                        'Submitting signing up form': [
                                            {
                                                cond: 'Nickname filed is empty',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user nickname.Invalid.Nickname is empty',
                                            },
                                            {
                                                cond: 'Nickname is unavailable',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user nickname.Invalid.Nickname is unavailable',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user nickname.Valid',
                                            },
                                        ],
                                        'Type on signing up user nickname field':
                                            {
                                                actions:
                                                    'Assign signing up typed user nickname to context',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user nickname',
                                            },
                                    },
                                },
                                'filling user password': {
                                    initial: 'Idle',
                                    states: {
                                        Idle: {},
                                        Valid: {
                                            type: 'final',
                                        },
                                        Invalid: {
                                            initial: 'Password is empty',
                                            states: {
                                                'Password is empty': {},
                                                'Password is weak': {},
                                            },
                                        },
                                    },
                                    on: {
                                        'Submitting signing up form': [
                                            {
                                                cond: 'Password field is empty',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.filling user password.Invalid.Password is empty',
                                            },
                                            {
                                                cond: 'Password is weak',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.filling user password.Invalid.Password is weak',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.filling user password.Valid',
                                            },
                                        ],
                                        'Type on signing up user password field':
                                            {
                                                actions:
                                                    'Assign signing up typed user password to context',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.filling user password',
                                            },
                                    },
                                },
                                'filling user email': {
                                    initial: 'Idle',
                                    states: {
                                        Idle: {},
                                        Valid: {
                                            type: 'final',
                                        },
                                        Invalid: {
                                            initial: 'Email is empty',
                                            states: {
                                                'Email is empty': {},
                                                'Email is invalid': {},
                                                'Email is unavailable': {},
                                            },
                                        },
                                    },
                                    on: {
                                        'Submitting signing up form': [
                                            {
                                                cond: 'Email field is empty',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.filling user email.Invalid.Email is empty',
                                            },
                                            {
                                                cond: 'Email is invalid',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.filling user email.Invalid.Email is invalid',
                                            },
                                            {
                                                cond: 'Email is unavailable',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.filling user email.Invalid.Email is unavailable',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.filling user email.Valid',
                                            },
                                        ],
                                        'Type on signing up user email field': {
                                            actions:
                                                'Assign signing up typed user email to context',
                                            target: '#Authentication model.Rendering signing up screen.Filling credentials.filling user email',
                                        },
                                    },
                                },
                            },
                            onDone: {
                                target: '#Authentication model.Rendering signing up screen.Signing up form submitted successfully',
                            },
                        },
                        'Signing up form submitted successfully': {
                            type: 'final',
                        },
                    },
                },
            },
        },
        {
            guards: {
                'Signing in email is empty': ({ signingInEmail }) => {
                    const isSigningInEmpty = signingInEmail === '';

                    return isSigningInEmpty;
                },
                'Signing in email is invalid': ({ signingInEmail }) => {
                    const isSigningInInvalid =
                        z.string().email().check(signingInEmail) === false;

                    return isSigningInInvalid;
                },
                'Signing in password is empty': ({ signingInPassword }) => {
                    const isSigningInPasswordEmpty = signingInPassword === '';

                    return isSigningInPasswordEmpty;
                },
                'Server returns an error for signing in request': ({
                    isSigningInRequestGoingToFail,
                }) => {
                    return isSigningInRequestGoingToFail === true;
                },
                'Credentials are invalid': ({
                    signingInEmail,
                    signingInPassword,
                }) => {
                    const isUnknownUser = existingUser.email !== signingInEmail;
                    if (isUnknownUser === true) {
                        return true;
                    }

                    const isInvalidPassword =
                        existingUser.password !== signingInPassword;
                    return isInvalidPassword === true;
                },
            },
            actions: {
                'Assign signing in typed email to context': assign({
                    signingInEmail: (_context, event) => {
                        assertEventType(
                            event,
                            'Type on signing in email field',
                        );

                        return event.email;
                    },
                }),
                'Assign signing in typed password to context': assign({
                    signingInPassword: (_context, event) => {
                        assertEventType(
                            event,
                            'Type on signing in password field',
                        );

                        return event.password;
                    },
                }),
                'Assign signing in request will fail to context': assign({
                    isSigningInRequestGoingToFail: (_context) => true,
                }),
            },
        },
    );

const authenticationModel = createModel<TestingContext>(
    authenticationModelMachine,
).withEvents({
    'Make user unauthenticated and render application': async (context) => {
        context.screen = await renderUnauthenticatedApp();
    },

    'Make user authenticated and render application': async (context) => {
        await AsyncStorage.setItem('auth-token', 'token');

        context.screen = await renderApp();
    },

    'Submit signing in form': async ({ screen }) => {
        invariant(screen !== undefined, 'Screen must have been rendered');

        const signInButton = await screen.findByText(/^log.*in$/i);
        expect(signInButton).toBeTruthy();

        fireEvent.press(signInButton);
    },

    'Type on signing in email field': async ({ screen }, e) => {
        invariant(screen !== undefined, 'Screen must have been rendered');
        const event = e as EventFrom<
            typeof authenticationModelMachine,
            'Type on signing in email field'
        >;

        const emailField = await screen.findByPlaceholderText(/email/i);
        expect(emailField).toBeTruthy();

        fireEvent.changeText(emailField, event.email);
    },

    'Type on signing in password field': async ({ screen }, e) => {
        invariant(screen !== undefined, 'Screen must have been rendered');
        const event = e as EventFrom<
            typeof authenticationModelMachine,
            'Type on signing in password field'
        >;

        const passwordField = await screen.findByPlaceholderText(/password/i);
        expect(passwordField).toBeTruthy();

        fireEvent.changeText(passwordField, event.password);
    },
});

cases<{
    target:
        | 'Rendering signing screen'
        | {
              'Rendering signing screen': {
                  'Filling credentials':
                      | {
                            'Filling fields': {
                                'Filling email':
                                    | 'Idle'
                                    | {
                                          Invalid:
                                              | 'Email is empty'
                                              | 'Email is invalid';
                                      }
                                    | 'Valid';
                                'Filling password':
                                    | 'Idle'
                                    | {
                                          Invalid: 'Password is empty';
                                      }
                                    | 'Valid';
                            };
                        }
                      | 'Filled fields';
                  'Rendering server error':
                      | 'Idle'
                      | 'Display error'
                      | 'Submitted successfully';
              };
          }
        | 'Rendering home screen';
    events: EventFrom<typeof authenticationModelMachine>[];
}>(
    'Authentication',
    async ({ target, events }) => {
        db.authenticationUser.create(existingUser);

        const plan = authenticationModel.getPlanFromEvents(events, { target });

        await plan.test({
            screen: undefined,
        });
    },
    {
        'Renders signing in screen if user is not authenticated': {
            target: 'Rendering signing screen',
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
            ],
        },
        'Displays an error when the filled email is empty': {
            target: {
                'Rendering signing screen': {
                    'Filling credentials': {
                        'Filling fields': {
                            'Filling email': {
                                Invalid: 'Email is empty',
                            },
                            'Filling password': 'Valid',
                        },
                    },
                    'Rendering server error': 'Idle',
                },
            },
            /**
             * Type on signing in password field must be before Type on signing in email field,
             * otherwise the machine is not able to handle Type on signing in email field event.
             * I do not understand why.
             */
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Type on signing in password field',
                    password: existingUser.password,
                },
                {
                    type: 'Type on signing in email field',
                    email: '',
                },
                {
                    type: 'Submit signing in form',
                },
            ],
        },
        'Displays an error when the filled email is invalid': {
            target: {
                'Rendering signing screen': {
                    'Filling credentials': {
                        'Filling fields': {
                            'Filling email': {
                                Invalid: 'Email is invalid',
                            },
                            'Filling password': 'Valid',
                        },
                    },
                    'Rendering server error': 'Idle',
                },
            },
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Type on signing in email field',
                    email: '-- invalid email --',
                },
                {
                    type: 'Type on signing in password field',
                    password: existingUser.password,
                },
                {
                    type: 'Submit signing in form',
                },
            ],
        },
        'Displays an error when the filled password is empty': {
            target: {
                'Rendering signing screen': {
                    'Filling credentials': {
                        'Filling fields': {
                            'Filling email': 'Valid',
                            'Filling password': {
                                Invalid: 'Password is empty',
                            },
                        },
                    },
                    'Rendering server error': 'Idle',
                },
            },
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Type on signing in email field',
                    email: existingUser.email,
                },
                {
                    type: 'Type on signing in password field',
                    password: '',
                },
                {
                    type: 'Submit signing in form',
                },
            ],
        },
        'Fails to sign in user when provided credentials do not exist': {
            target: {
                'Rendering signing screen': {
                    'Filling credentials': 'Filled fields',
                    'Rendering server error': 'Display error',
                },
            },
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Type on signing in email field',
                    email: 'not-existing@gmail.com',
                },
                {
                    type: 'Type on signing in password field',
                    password: 'not existing',
                },
                {
                    type: 'Submit signing in form',
                },
            ],
        },
        'Signs in with valid credentials': {
            target: 'Rendering home screen',
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Type on signing in email field',
                    email: existingUser.email,
                },
                {
                    type: 'Type on signing in password field',
                    password: existingUser.password,
                },
                {
                    type: 'Submit signing in form',
                },
            ],
        },
        'Redirects to home screen if user is already authenticated': {
            target: 'Rendering home screen',
            events: [
                {
                    type: 'Make user authenticated and render application',
                },
            ],
        },
    },
);
