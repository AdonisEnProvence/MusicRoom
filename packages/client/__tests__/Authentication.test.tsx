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
    /** @xstate-layout N4IgpgJg5mDOIC5QEECuAXAFmAduglgMYCGBA9jgAQC2ZEYANgHQCSO+BxD+AXqfhQDEAWWIBrMJVSwwAJ0rEM2PEVKQFOCJVm5684gAcD3EuRyJQBsrA4DzSEAA9EAZgCsATiYBGAOy+XADYAJhcAFmCwgAZAqN8AGhAAT0QAWl8fDw8ADm9ctzdfDxCPMIBfMsS0LFwCUzsaOkZWdk5uPjMRcUlpOSkcRRqVU3ViTW1dPsNjVTMLECsbOYdnBFTvYK9stxcPfzco7Oywo8DElIRgtzCmaPCXbJcnk+Ds4IqqpVrZhtp6ZgASpNZPgcFBKDYoOwwRDCDpcEwAGL4BjcGFwyDfLiwJEotHggBm+EYEBxyNRoPBYGoxBRggAyqgAEbUDgQ-BQymUUGUAlkWTUeaLWwUearbzeFxMB5RYKBMIeGK7bIec6IbxuR5MKIPDzBXy5bJRNwhD4garKOr8CiNf5MIGaORcyHQ8GwDEI8n4ygY+gqbG4ikwokksl4rnU2kMQQAFSSBkkNpdXJ5kZRvOJDAgQusIvsoFWHm8gSYgV2cV1gVikrVCGLcqYvjCmsCbjlRzybjNFu+9Rtf2aDr0zo5rth8Jwge9vqxDDDQcJmdJU65BmIsFgAHd+RAGczWeh2ZyYTy+QKc0s7GL1Q3JWFYr4q9lH7LgrXgvq3EwTa9coFn74OzlJU5pfMM1pUAOgLAiOx5uh6k5elyM7+nOK7Bku87emuG7brIu5xgmlBJqOKZUDhW47hmJIXnm14IB4bjeKWAQqh4Ty-oE3jvu42TfmELiPsceq7O8IE9uBZi2oOMEwsmckIeh4IoW0WFciGWawIIEAUGATCwOgahMBJVpSVB9qyW6pEKROSk+jofqqXZGmkrRywFuquxSjkvGbAaeSAbWeStkwxxMfKvjFhqoTdmBpm-E00GOiCcnWfBtlIeiDmzmpGGhl0EhHmOPI6AAjqgcCHgSUZuVeKyeVk2oHOxxSBAE-hBQJX7eBW7Emi4kSvLFQzxf2iUWclsFju6tlDk6clyAAbn0ciyPye4smy8ngqe-KCg4wruU4rhRMxWRZLKvHbD1bi1oUZ2eAc3jRG8gHDZaPxjXac0pVZcHjmAuDabp+mGegekmZ9kHjT9U3OghtWivVDGytKxpHJ4RxNrdySIMExqlhq8oqs8kSMe9vYQdJSXDql-0zYDOCCAACjoG6UEyGDoDa3OUFAZCULzLpSAYAO4Ij+bHWsGyhfKrwBMWKoBGcuOXP+Jaar4H743sGpduJcVQ9TE2039Y6oKLDOeuGWWYqhuXgr08jsIQYgDNQYAbQeBB0+botnvtli5kdqzNnxz2CQqxp+M92S1i4EpREwcqPnqAlGmEj4U5JCXfZZRVchbYuITbynZfbdlO5QLtu8QHuxvGiZUNtItSDIztELXHvUVmEv0RjtwDVW7YPkE8fPUnBRBGEEStjqgTZ6N0N55NvuF5bimZWXdtOVvbd9BReG7oym3oD7Zvr7ye198jAlJ0U2Stjr-6SsWtYRIq0rhdsOqKm9BsjSNuZWGa8YRFytiXBc9kd74ADHvKuh8dwNyIiRf6RcEHrkovhHu2YDrBzqh5BA2wSx7GxnETUxR9TvyCF+fU3hFQ9WiKUbwi8gEw3zi3cBm9S7QMcrAtC8D26UDTNGE+3s4ZgP9tfPBl4kaEJnsEbUbVnp+D6jsYo8d5RbE1Jsf8VwAiRFYX2ZeMlV4X0kcXOyKl+EO33vIERyCm4FwsVXEROCb6EKLIo+UDxHjBHoZseOAQvBCXCBsXYTE8hGKpsAjhaVW4QKseXVSwMcB6QMkZSGxjjYgPMY7DeGUeHWOxB4qWkojSlmNEWJicRQjXCCYcRsGp7xPANEEK4FQQI4CaPABwWSYnjTYLYLgvAIKlNDsxISbw9itj8FcMItYvCHCNK8O+xZM4FGiWZdhZjKCYDIN3CB4z1SnUUYae8gRiivncLWVIIV-I9S1lkBU-Utm51MabZx6VGZJJgXAnhLlbEiNYBABgYBjl1lOj4S5+R3AmlKK8TqVZQqAVaicV8wFPiAOybE3ZLdEl72KQIgFmE7LArYItEZEAmAAFEaTpnwLAYR1ADDoAuEHWRktVixBLO4SKbwogKmiIcIK8ok5PnvDPaIrwxJYo+jinZnz8XcKgUS2xgKyX0uYBSqltKtXciZaCSl3BcEcrosjWIX42ouCiHEWURxSg4wuDHPiRQnhKi4r4Y0mLQLYoGSvJV8SCVFOSTY5ypK97kpwMa-ApqFj4LkVLTUzFrW2q9b+R1QUTQZEuVrI4mwZUsIAfK-1Hz5p5MsYS0N-yoEasjVqpgAA1KlELNTdQVHsTYEoTQq2dUaEsWsriMU8IcTObyvplt+l8ytIa-nEtrRGnhIiIX+GhTkDUcLLkRDjqrcpZ1BVllCBna4Pr+nbIDeW6dwbVXVvnd6OtPDEH4RBWCiF2xvz4weO4CUidWzvmLEne1RYcjXByM2cdJiaaXuVYUm9c71WLqgU+6lOqTVMGZpgo+BrmWsvZfGzl9ETQpq9QEO+vinV402EnaITYqNtVyBBnJcT6YqunLehDoY7LIZaDGuNh0CFJsEixCsZGMbvn8RkLq7EvUagVr4RjuLA0sdg2x+D4bON72482k1raAjShev4+hTEAjvhOMxGeKoXiRXCP-OVlNz2Tokd862cG+E1vvYh7CmGdwQq4h+nUjxIm-oo5cchTVaMGllIqBexb7PvKg1OmDPyq1qb3oCiFQm2wBe-T+mIIXJSNPYgNHIrwYjHGyApxV0Gg2seQuxqc6h0syPNYQ4s1xoXXAKAcKsjEXBBQdaFASkQhL+O2JVi9iWasqbq-BiFkp-NfqCz1WZQU6lMGKHkGIH5H55fG450BznJy5IhEtFasg1qyBfeC5rIdECAQ-So-YPUgjcVViaJO4RJWZz0ScGLdmc4ToS05yxx327LXsed-kTAAAijLjDECSMIyHsgIVFnMzEQ4ngqzXANLWf8SdRsbodXqOUe2gcHZBxw07EOLtMDERwcGWhYCoEIIQOAsACSoFRHh-jibCyeGlFkIoWRZOsSCrKSeNquKWrbA+MnJtqvKZ+aD6nSOLutuYm2R7gFntcXfvdwSTxlv-kzh4eXoOpuMwhesajRRpcnCOCTBU79UbRDyBt2U6c9jm+Y37GdrmcqVyETXd2ekWCguu2a27KNbhVg7Sca4uwFmqxtU8aU-gvHsTlA8H3eL4lcOm7bNzd7C7B87qHptLabsCfFO+4sA1ChtmOBKeOXlk7hU8D1UoLhc9Kb99e1TxfbFVxD3XMP0bdUADly9j+w9SXDc3bUPeVDUzwTZVQp+Co2U3gkNS2tePrf7S8mN57QQU5Ls6h9B76KPj2PGp8z+7oy-oxBKUomIEyV91e+cnMnv4lfN0ewzuKerwUokU0mjwgE9qveiu-etWRegegiN+j+4+vGK6Gs-+IGgB6+4882-g8ozYUQewjEOoMBk2Z+-ug+iBPCI+KBraiiWuABVSOBqsmwJwtwMQysBoxm8msWAOkGCu5BcBhe28V+SB8g3G4eX+UeNeiA7EpYJwMyvERBMQvaiAEQz0hMCoz4hwOQ-4ZBwOBeF+AeFc4hlAWmVeMhP+kKkmko1SMoA0-k78WOguj4dSVwfgp6hsCqE2hh5+LmVBphNBQikhE+aGGGuEVEz+8+bKc2GojYOuf8VSM84Q1CjEpYnedhkQRovBR+bCvhFORhARM2YhwRB83mz6qGsa6GFRWgz+m4YA4gcRX4T2SRngKRyeFwM8eopYNqRoA04QMQBhhR-hkCgRu8ZREhtR9+Om3+XKchkyiRdq7RAknR6hA03iz40m-gpGf2vqJaDm5OFaRRYxJR1BUCGCkR+EvmGQrRyxpQqx78GwXgPiuQRBEQNGwxxxoxvypRFxQi5KEeK6XgehTwj8kQtqrYIWL2GQ7Ej8jwgk9GOwXx06Jxvx5x3oriDa2msaEKkqPgqhGw+MOov4Lu+Mtwj4VYDefUPefBx+imsBl8A+ZxQR-xK0DaVR1KdKUYc+LKsRcx9EjU-gAWHxAQMoahCAiJNw5YoQxBRBVwh++xcWgOghfhlBLJExbJ9iHJYR1R3JDKhqupfGCa8xDEXgTEuQ0QIQqyxC8cYUyceQ7YTEDhuRSp-BJ+feTJ8BohGJpe7JUYMxep+qz+qAAwb+DAH+0h+GLWZSS+yioQIQkc-4j88cWe62c8AqngpQKJnCPxKWfxmJAJOpaBApyM92FpE81p5WJomiRYtwAUmcrExwAQOZ+eeZl+vpYCRZNUpZhCTE34eQlZ22CeEp7gA06Z4Bkow2cQrZFBzJCB9sEK+oA5lpW2Np-U74z4X4XU72ZY-gxYs5whPy9IbZV8AoEI+4DO6gzOrO7OnO3Oc2n2GROQF0ehWsCQKexwJYzZUy+MM8hQh5XpE4GWK5Q565IQO6FwpWiikqDw3RsoU8ZO1uG6oU6i+wyyDuEp6wDwjYbY6Kz0w5TwnSZQQAA */
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
                          type: 'Press button to go to sign up screen';
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
                        'Press button to go to sign up screen': {
                            target: '#Authentication model.Rendering signing up screen',
                        },
                    },
                    onDone: {
                        target: '#Authentication model.Rendering home screen',
                    },
                },
                //here
                'Rendering signing up screen': {
                    initial: 'Filling credentials',
                    states: {
                        'Filling credentials': {
                            type: 'parallel',
                            states: {
                                'Filling user nickname': {
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
                                                            within(
                                                                screen.getByTestId(
                                                                    'sign-up-nickname-text-field',
                                                                ),
                                                            ).queryByRole(
                                                                'alert',
                                                            ),
                                                        ).toBeNull();
                                                    });
                                                },
                                            },
                                        },
                                        Valid: {
                                            type: 'final',
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
                                                            within(
                                                                screen.getByTestId(
                                                                    'sign-up-nickname-text-field',
                                                                ),
                                                            ).queryByRole(
                                                                'alert',
                                                            ),
                                                        ).toBeNull();
                                                    });
                                                },
                                            },
                                        },
                                        Invalid: {
                                            initial: 'Nickname is empty',
                                            states: {
                                                'Nickname is empty': {
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
                                                                    const nicknameIsEmptyAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-nickname-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toHaveTextContent(
                                                                        'This field is required',
                                                                    );
                                                                },
                                                            );
                                                        },
                                                    },
                                                },
                                                'Nickname is unavailable': {
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
                                                                    const nicknameIsEmptyAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-nickname-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toHaveTextContent(
                                                                        'Nickname is unavailable',
                                                                    );
                                                                },
                                                            );
                                                        },
                                                    },
                                                },
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
                                'Filling user password': {
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
                                                            within(
                                                                screen.getByTestId(
                                                                    'sign-up-password-text-field',
                                                                ),
                                                            ).queryByRole(
                                                                'alert',
                                                            ),
                                                        ).toBeNull();
                                                    });
                                                },
                                            },
                                        },
                                        Valid: {
                                            type: 'final',
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
                                                            within(
                                                                screen.getByTestId(
                                                                    'sign-up-password-text-field',
                                                                ),
                                                            ).queryByRole(
                                                                'alert',
                                                            ),
                                                        ).toBeNull();
                                                    });
                                                },
                                            },
                                        },
                                        Invalid: {
                                            initial: 'Password is empty',
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
                                                                    const nicknameIsEmptyAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-password-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toHaveTextContent(
                                                                        'This field is required',
                                                                    );
                                                                },
                                                            );
                                                        },
                                                    },
                                                },
                                                'Password is weak': {
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
                                                                    const nicknameIsEmptyAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-password-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toHaveTextContent(
                                                                        'Password is too weak',
                                                                    );
                                                                },
                                                            );
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    on: {
                                        'Submitting signing up form': [
                                            {
                                                cond: 'Password field is empty',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user password.Invalid.Password is empty',
                                            },
                                            {
                                                cond: 'Password is weak',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user password.Invalid.Password is weak',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user password.Valid',
                                            },
                                        ],
                                        'Type on signing up user password field':
                                            {
                                                actions:
                                                    'Assign signing up typed user password to context',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user password',
                                            },
                                    },
                                },
                                'Filling user email': {
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
                                                            within(
                                                                screen.getByTestId(
                                                                    'sign-up-email-text-field',
                                                                ),
                                                            ).queryByRole(
                                                                'alert',
                                                            ),
                                                        ).toBeNull();
                                                    });
                                                },
                                            },
                                        },
                                        Valid: {
                                            type: 'final',
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
                                                            within(
                                                                screen.getByTestId(
                                                                    'sign-up-email-text-field',
                                                                ),
                                                            ).queryByRole(
                                                                'alert',
                                                            ),
                                                        ).toBeNull();
                                                    });
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
                                                                    const nicknameIsEmptyAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-email-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        nicknameIsEmptyAlert,
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
                                                                    const nicknameIsEmptyAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-email-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toHaveTextContent(
                                                                        'Email is not valid',
                                                                    );
                                                                },
                                                            );
                                                        },
                                                    },
                                                },
                                                'Email is unavailable': {
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
                                                                    const nicknameIsEmptyAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-email-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        nicknameIsEmptyAlert,
                                                                    ).toHaveTextContent(
                                                                        'Email is unavailable',
                                                                    );
                                                                },
                                                            );
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    on: {
                                        'Submitting signing up form': [
                                            {
                                                cond: 'Email field is empty',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email.Invalid.Email is empty',
                                            },
                                            {
                                                cond: 'Email is invalid',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email.Invalid.Email is invalid',
                                            },
                                            {
                                                cond: 'Email is unavailable',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email.Invalid.Email is unavailable',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email.Valid',
                                            },
                                        ],
                                        'Type on signing up user email field': {
                                            actions:
                                                'Assign signing up typed user email to context',
                                            target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email',
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
                            //meta check redirection to home
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
