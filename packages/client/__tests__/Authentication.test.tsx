import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    passwordStrengthRegex,
    SignUpRequestBody,
    SignUpResponseBody,
} from '@musicroom/types';
import { createModel } from '@xstate/test';
import { internet, random } from 'faker';
import cases from 'jest-in-case';
import { rest } from 'msw';
import Toast from 'react-native-toast-message';
import invariant from 'tiny-invariant';
import { createMachine, assign, EventFrom } from 'xstate';
import * as z from 'zod';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { assertEventType } from '../machines/utils';
import { db, generateAuthenticationUser } from '../tests/data';
import { server } from '../tests/server/test-server';
import {
    render,
    renderApp,
    renderUnauthenticatedApp,
    waitFor,
    within,
    fireEvent,
    generateStrongPassword,
    generateWeakPassword,
    CLIENT_INTEG_TEST_USER_ID,
    renderAppWithNavigation,
} from '../tests/tests-utils';

interface TestingContext {
    screen?: ReturnType<typeof render>;
}

const existingUser = generateAuthenticationUser();

const authenticationModelMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QEECuAXAFmAduglgMYCGBA9jgAQC2ZEYANgHQCSO+BxD+AXqfhQDEAWWIBrMJVSwwAJ0rEM2PEVKQFOCJVm5684gAcD3EuRyJQBsrA4DzSEAA9EATgBsAJiYBmAOwAWbwBWAAYARgAOMKCPN28AGhAAT0QAWn8wlyY3AO8wj19vfxdQsIBfMsS0LFwCUzsaOkZWdk5uPjMRcUlpOSkcRRqVU3ViTW1dPsNjVTMLECsbOYdnBFSPF18fFxcIjO9Ytxd-IN9ElIQw-xCmTZDfU4Or-zcQ7wqqpVrZhtp6ZgASpNZPgcFBKJgyNRJLBCDpcF0JFIZPIoGRKOh0Zh8LBKAZZGQAGb4BgwsDoAhg3GEgnUCFQyRjLQ2KBUMgYeaLWwUearUI3EKxFxhYL+KL+XxnZKINz+bI7EpXI6CuIuD4garKOr8CiNf5MIGaOSg8Es9hgyiw+E4JgAMRJ3AtcMg3y4sDtDpNlGJjAg7vtDEd4LA1GIJMEAGVUAAjagcS34Vle0Hesiyaic6zc+ygVapfIhCJMMIPEIhNwRCK+EK7c6IMJhN63CIeVvC-wFVvqzXfeq6v7NQ16L1mkfO3AewNe530FRuydB734X3+z0WkNhhiCAAqSQMkl1o4tKY3JKXvszSzsvLSwS8HiC7mCORyEU8dYQLnCxYOBQiQW8e5G3KSoNS+YYdSoAdAWBEdE3NU1xxtANFxnV0GFXKcLR9Bg-QXL0DGIWBYAAdzTCBIxjON0ATJNjyoQk0wzBwuWWXM0kbcsmFOOI-AiXZ+LyD9MlbJgNjCNx+X-GsQn8btwO1Mw9UHWCLSPRDrXwp0dFnNpMMXHC8JQgiiNI8idz3A8qHUygU0I4iyNkLRDMvbMbzWK4tgiQCYkk8tHweIJhN8Nw3CYXx-wrQV-xCq55KGRTfiaGCjRBNT4LHTTjO0l05wwrTwUM2BBAgCgwCYWB0DUJgewgpToINVTTQytSkIKyg0Ly-SvSK1y2KcRANjlBtfAk-jRsFXwXGEjwmxiXwPE4-i33yeKtR+ftksa1K4LojSwAnbLwU6vT2qKxEYRa8EUx0ABHVA4BowlNz668Vg4yUwluUaxUyf8RROYTAjCoJ-ECCaWzcRtfDW3tIOUlLh3SvbLTaodjTUuQADc+jkAlZEo2N4xslNGPTV6eXetZ-zlPw-uFAGYg-DwTjlFxAOKF5xt2GHQNqxLNv1dG0ualGrQOnASrKiqqvQcr+Y2qCtuF3aENR60KZzAaEErLIO2OctG34r8EmlBBRXlMH8g8IoPD2NxYbqpKhaa2i1fFhEAAUdGIyhowwTEqExSg0QxdEzSkAx1YlzX3MKIsDjebzCnZsUImE2Usj2FwbcrQJoncR2BaVl2duRtXUCjj3kLXY6dPQ7qLV6eR2EIMQBmhQnqLdyPU3Jlis361YCyyWJJvyV4WaiDORW+h9okWiSQqLxWEe2pHRYrqu2qOjr6669rm8oVv2+ITvd33ShD3g3uj5PjvJBcger0p9jLjyLJqz8Ioa0lIIwmEjnIs-5+IViCBWEKBwV59hLipMum8vSV2jodWue9cqnV3kfeyZknJd2JjfJBZNmKWEHm9N++RvBhUiP-F4-9fKCmZpkbwTBwiSWhnbKGexoHwwaircuiDt5ZVQSdfA85MEojxKZRyFEL5WR7kgrBUjyLnlwrHKmIoSy3DiIcTYsp7huGZqELYJsbZgwiDWd4fMFKr14a7GySDq7tREWI1BR9TxbijETGiEdCFMTUeQlmYVvDHBCicIBsoPzuC2LNTO+wgigwktw+qys7FXV7o43ezj8riNxqGcMsir7WQIVHNxeSGAqIgP47WIoDjFklEcUGIV7jxOEkULOnk4ieG8pkJJzs4EbzdgI5BNcsJ13QaI-KAAZMgZAxC+PkKgHA7cyAkWstjXGsh8Z4O8cUvuxCFikNftU2IQRthvgfG08shRmaSi8OWe4IU9ERVOL0wW-SMYIKboIiWTj956SljgcqlVqoKxgWvPhnzwQOJ3sIv5Ez4DPzcuolszCAIvDbDJAxZs6ZiQil0go9y1RWISjYlJ8DBlfOGb88ZboLryKjndB6lUMSYAJCRfoyzVmUDxmmKpqxZqFh8J4B4BRgjHDiB+XWWjWwyWCScXmnwSVgtseS+x3yvY+1xP7Ckupg6h2DhHFM1c+WIAeMwyhEkSx00fEFM2Vx-zbHAQcYo4D-yWMVetZVZKBnuI6hQYk6Z4YZOEU0AFQLZby2sV60uPqyl+pwAG0MSlg2jL9fQE15sTgJ2CaNIIb4xTgOEk2YIj4-DPJtqNV5sDEYfO5XGwg-r8CBuTTC1NDb6AWUvrqBtCam1JoaO2x+y5VGIqHogH+NxKEARCDQq4woPzpCbOzUGGRrhVglBEKt4LXa+p7YmoNrbUKhs8d3Pdfb4aDr2RmlmIViwljfJWSImxAgLqYUwfiHYJIdnMaYhVYElU8O9bW3djbm0NGrmGmWIKo2AZjcB+toH+2HiQhmp995S01mfTkB4C6OHZCKL+MGnDvCWNAjgJoCKUAweSfqNgtguC8Eghmk4Nwqx5FOHcIoAFbUXFSKEOUdsbZln4rNa2W6VUDMhNCYZqGAJhUWqFF4lrZLpzNukY4Ph7js3COEKsUNxNAZFhS-aKC21wpcamoq7V3GsAgKSDN+YYk+BCv-Ea1YHhYouO4ATrY5XtnMXkAzcGjM2RTahcz2TUFWd3jZtgWMGMQCYAAUTjTiOtBh0AXBIS-LWeY2EsI4xKCsOw3yefrBQpgwMyySQlLEDsQX3khbSWF6cEXG6FWHUZVBsWcDxe4IllLm5bK4lBH1-AlTR1kO1qkSSzDIEczthFKsHgi2SnfXETIoNZrxIAg1mtTWxaHtazSyLlnOvtbrZuFoY2JvZaRW-Gba35uyUW5WBaRbZLvoWkUPTYMNgO2JZ62DjXVaZR+ZktrZ1zvWbKUwAAaglhzoVmElGCMbACRQwZA1nvE8xRwSwdnc3t9etbQtHZyrpeFUOVww5epNo5eYKFeBLPyCsVYayqYuFWUeeQOwbDq4+YnELjNUohydi70XUHYOkbZ+z9PcscQbAJhaLNOYzsbDx+sU0vqth4jxETC0hepMO0Isz4vqe4Qu9L8i12EtME9kopyw30uZYc3Q7I+RQhDTfN4PYgC7Y+FBqDWSmRJSFCN6q5r5OxmU4swZaHu9rdOVt-1t3wSPcPkFMcH3fu7X-lOZQ58execkZAh6uGNGQf8Naqb8L5vd6S9TUnxLCPU-y-cnxwC3FZJlimno33muECLQdeAwsj5Zpij-hHgZZPa-Hdj6d+PNPE+O9uwcnLHeGy+9xa2MGBt-4zuClxX97MIozu8h4afpOo9z4pw3C3foHOe6oaWcsb2OeSuP9cFj7Mohzqvwdu7NHmggvvpOoL1O3lTGKF4IpjerENEC2N5DNFcB7n-LJJJFWAEAAaDjXuDrCuLk-lNKcpsPan9P-Fxh+IUMwizCEh+psJWoDhXn0vtjgSZjaMLiiDjPIDyrILLmAIQWFF+BKIKGPAtNWIPmPMzjWDbI+EcLsPEtgdXmwSTiFustwZsmmEwAACI4jGDEBJDcoaG8FxYJYgENwOadiVbBKhTlhQx-wszMzZ7ZD555pKjj6KGQpUocFqGGH4zaG6EMD6G+GaEACqSy5GXKnBGy+MFhEUPgLwsoxW3kEoEhOwAmeaVsIqoMRK5eTsbyLBShXhdiPhPB-hsAehBhPBDmgEXgRQimSRRQOGZsi2pyRwYolCLYsQ-4HhIuji3hsgXBwRvBJ6HAcszIqAhAhAcAsAhIqAgYWW6+9202EC3EpwWeMQ3kioH4eQZYPgts0QBOsoQQPRs+Py-RgxVRkBD2VYCco0uwDMXGK2zRlCWQ7MJQrY1YVwjSJxN+McVx02kQmQ30pB8hjMH4NhYkea2iGwlCrMPxKM0Kt+Me9+OSLcRAp80IfBqGfgWQSc+QMUJGnRwkrq2wT4EkM6dx8JW8ou+BoBh8Ei98Z85Ure422JcRgo4CuwvupirYxJokkM-EGuMkxwVJQyLWd+B8qJx86JD8Ke42TAAAcjKUyc7iGBlgsaxFNsPBCXYbxPcAUCUGVpcIUFsPkNpsJgtBkKKZSuKciZKa4gycqZiSYf1oqU6ZIGlossQPFiSMQNGHLndmOpcJJK0SWHqWIYaRnMKKsbKF+lEHbHJIwXkdWioaweksAVkhdnfO6XKWvpqQzvWBtqgeGQaYWnapwtxDVmDMUENNaVCuqiMnXnSVKYydCKhtQmJJPKNJIb9EDH4O+pQrJIELQb7nWemUiWYfaamoog5DbiwHZvwf8cPL7ijscAzA+uWIwhKJVuDJ8fHDWGOYiXgWbs2Q6X0M3vDojkufWNyc2FPEvNWE8RcItN+OzpWJJK+DEIeQ2dSqedORIheS6fKQ7rOU7mlmqa7tecGYENkOWM6tcKNL7kaTbBJHUsEIKAcIUA0t+TSSeSiWefIIBb1nbiBTgloGliRGAOIKhrKNQTbBWlPMuv4MzASrBYbMtlcJ7jhbaZORggRZIqBYlkBXmYcgrsGUCb5gxWKExYwpsLBd5jkCRm-scUmcXNupHgiT+WLn+YuDOWRahotMzv9LQgvJPMzKwl9jsF8UQfotxRmZDlKbFguQZdECwgtI2KFAgSRoPvbMWK+CWBJMKGIXZROZmfSbkldiySJRvuoiueFL7h2MUGagFJKreoSolcHjbCFceU2fhf+RFSSLmclqlriBBRqaJe5BJEULcGPjnDnJ4M8MJPkD5h2FCbJDEKDNlaZrlVObpRIj1jdsVUNmlqNleYGVqYWdvpJO5oWJ4GWKDE1UcOFO4AqAXN5V1Y2fPnlX1QVcwMJUNWeJ6QMD6YEf6YueNQWcGRsDVf+HVbEItFjnaotAXkcCnD9M8CpbkWpRJtfppbhT1XxfldwbDsJTRTOjdePvVQ9cxXaurmJCRhkJkO0QqBtb+dtYgv1WUu2dGfqR5VDHmt5ZQVDHUhWCcJEIWBwqjdpfftMrMvMhyhEWsgMdEZofOQGYsUGVcP2Y+FpugcKLbDcrEJVjcdpj9pTapaSsFmmUed1VtQfLTXMlHGTAzSskzRcUYbmTRW+NxPbJNA8GKG8MzCtIHhWK8AFfjgDl9ZLVXp4TLZtRKadArfTYspymrSzbwVFahsDNxBFIOX+DWBkMzFFLcAcTEAbeEDkf+kDpXgUbbVpbSTTTMorX3CrZESUUYQZRkGcp4Gil+IpYYiULcCzOTcUEvJ9VHUwfkamYUXbWjV1O2cTZId2ZPL2WbGzsWCAoUCJGKBKBte2f2U3RPIKK3RcPjcWGueEBPlcPcD0SBr2mBshqFU0FiVBa2C2JVuEPNl+oBKbLxgploi2GaY+rNJfhLdGjbZdmeGegvdZBmcvZ7avbVmJMXbsC6m-rvfWDnCwl+Etmfv-KFJumfcDrHZfeUtfUhrfUvfQEVQAMJNCqnUDqkZoczGJLxZrFB1ULpVhiTsKPr5xfqz0Ibz0QP-XTjL37VwP0DO6jVt4XViUoMh05DoM7AbCRLhTmIE4E2UIXKANW3n0gNz37otpQPlSg1QU1Eo5oMZEsPTRqbkliSsIzqGmSQPiENDbgMHoiPXoPhFjXBhml60WG1qaARfQlBfhfgijoEa5qNX2IaaM-JwPEPqDuLIOhRZCbbVi6zI5SgXBTQ4Om0HG1aF42NgN2PCN-F0PuS+Zyh6Nb2GMf1rBFZF1xDFBvCFCyR7ZP7F7Am-SgkUFqanDRKFCzT-jbZgIVAVBAA */
    createMachine(
        {
            context: {
                isSigningInRequestGoingToFail: false,
                signingInEmail: '',
                signingInPassword: '',
                signUpEmail: '',
                signUpNickname: '',
                signUpPassword: '',
                isSignUpRequestGoingToThrowUnknownError: false,
                emailConfirmationCode: '',
            },
            schema: {
                context: {} as {
                    isSigningInRequestGoingToFail: boolean;
                    signingInEmail: string;
                    signingInPassword: string;
                    signUpNickname: string;
                    signUpEmail: string;
                    signUpPassword: string;
                    isSignUpRequestGoingToThrowUnknownError: boolean;
                    emailConfirmationCode: string;
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
                          type: 'Make user go to his profile settings from home and sign out';
                      }
                    | {
                          type: 'Press button to go to sign in screen';
                      }
                    | {
                          type: 'Submit sign up form';
                      }
                    | {
                          type: 'Type on sign up user nickname field';
                          nickname: string;
                      }
                    | {
                          type: 'Type on sign up user password field';
                          password: string;
                      }
                    | {
                          type: 'Type on sign up user email field';
                          email: string;
                      }
                    | {
                          type: 'Make sign up request throw unknown error';
                      }
                    | {
                          type: 'Type on confirmation code field';
                          confirmationCode: string;
                      }
                    | {
                          type: 'Submit confirmation code form';
                      },
            },
            id: 'Authentication model',
            initial: 'Initialization',
            states: {
                Initialization: {
                    on: {
                        'Make user authenticated and render application': [
                            {
                                cond: 'User has confirmed her email',
                                target: '#Authentication model.Rendering home screen',
                            },
                            {
                                target: '#Authentication model.Rendering email confirmation screen',
                            },
                        ],
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

                    on: {
                        'Make user go to his profile settings from home and sign out':
                            {
                                target: '#Authentication model.Rendering signing screen',
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
                                    initial: 'Invalid credentials',
                                    states: {
                                        'Invalid credentials': {
                                            meta: {
                                                test: async ({
                                                    screen,
                                                }: TestingContext) => {
                                                    invariant(
                                                        screen !== undefined,
                                                        'Screen must have been rendered',
                                                    );

                                                    await waitFor(() => {
                                                        const serverErrorAlert =
                                                            within(
                                                                screen.getByTestId(
                                                                    'signing-in-screen-server-error',
                                                                ),
                                                            ).getByRole(
                                                                'alert',
                                                            );
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
                                        'Unknown server error': {
                                            meta: {
                                                test: async ({
                                                    screen,
                                                }: TestingContext) => {
                                                    invariant(
                                                        screen !== undefined,
                                                        'Screen must have been rendered',
                                                    );

                                                    await waitFor(() => {
                                                        const serverErrorAlert =
                                                            within(
                                                                screen.getByTestId(
                                                                    'signing-in-screen-server-error',
                                                                ),
                                                            ).getByRole(
                                                                'alert',
                                                            );
                                                        expect(
                                                            serverErrorAlert,
                                                        ).toBeTruthy();

                                                        expect(
                                                            serverErrorAlert,
                                                        ).toHaveTextContent(
                                                            'An unknown error occured, please try again later',
                                                        );
                                                    });
                                                },
                                            },
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
                                        cond: 'Credentials are invalid',
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Display error.Invalid credentials',
                                    },
                                    {
                                        cond: 'Server returns an error for signing in request',
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Display error.Unknown server error',
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
                    onDone: [
                        {
                            cond: 'User has confirmed her email',
                            target: '#Authentication model.Rendering home screen',
                        },
                        {
                            target: '#Authentication model.Rendering email confirmation screen',
                        },
                    ],
                },
                'Rendering signing up screen': {
                    initial: 'Filling credentials',
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'Screen must have been rendered',
                            );

                            const signUpFormScreenContainer =
                                await screen.findByTestId(
                                    'sign-up-form-screen-container',
                                );
                            expect(signUpFormScreenContainer).toBeTruthy();
                        },
                    },
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
                                                                    const nicknameIsUnavailableAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-nickname-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        nicknameIsUnavailableAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        nicknameIsUnavailableAlert,
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
                                        'Submit sign up form': [
                                            {
                                                cond: 'Sign up nickname field is empty',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user nickname.Invalid.Nickname is empty',
                                            },
                                            {
                                                cond: 'Sign up nickname field is unavailable',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user nickname.Invalid.Nickname is unavailable',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user nickname.Valid',
                                            },
                                        ],
                                        'Type on sign up user nickname field': {
                                            actions:
                                                'Assign sign up typed user nickname to context',
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
                                                                    const passwordIsEmptyAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-password-text-field',
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
                                                                    const passwordIsWeakAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-password-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        passwordIsWeakAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        passwordIsWeakAlert,
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
                                        'Submit sign up form': [
                                            {
                                                cond: 'Sign up password field is empty',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user password.Invalid.Password is empty',
                                            },
                                            {
                                                cond: 'Sign up password field is weak',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user password.Invalid.Password is weak',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user password.Valid',
                                            },
                                        ],
                                        'Type on sign up user password field': {
                                            actions:
                                                'Assign sign up typed user password to context',
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
                                                                    const emailIsEmptyAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-email-text-field',
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
                                                                                'sign-up-email-text-field',
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
                                                                    const emailIsUnavailableAlert =
                                                                        within(
                                                                            screen.getByTestId(
                                                                                'sign-up-email-text-field',
                                                                            ),
                                                                        ).getByRole(
                                                                            'alert',
                                                                        );
                                                                    expect(
                                                                        emailIsUnavailableAlert,
                                                                    ).toBeTruthy();

                                                                    expect(
                                                                        emailIsUnavailableAlert,
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
                                        'Submit sign up form': [
                                            {
                                                cond: 'Sign up email field is empty',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email.Invalid.Email is empty',
                                            },
                                            {
                                                cond: 'Sign up email is invalid',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email.Invalid.Email is invalid',
                                            },
                                            {
                                                cond: 'Sign up email is unavailable',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email.Invalid.Email is unavailable',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email.Valid',
                                            },
                                        ],
                                        'Type on sign up user email field': {
                                            actions:
                                                'Assign sign up typed user email to context',
                                            target: '#Authentication model.Rendering signing up screen.Filling credentials.Filling user email',
                                        },
                                    },
                                },
                                'Lookup for unknown server error': {
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
                                                            Toast.show,
                                                        ).not.toHaveBeenCalledWith(
                                                            {
                                                                type: 'error',
                                                                text1: 'Something went wrong please try again later',
                                                            },
                                                        );
                                                    });
                                                },
                                            },
                                        },

                                        Invalid: {
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
                                                            Toast.show,
                                                        ).toHaveBeenCalledWith({
                                                            type: 'error',
                                                            text1: 'Something went wrong please try again later',
                                                        });
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
                                                            Toast.show,
                                                        ).not.toHaveBeenCalledWith(
                                                            {
                                                                type: 'error',
                                                                text1: 'Something went wrong please try again later',
                                                            },
                                                        );
                                                    });
                                                },
                                            },
                                        },
                                    },
                                    on: {
                                        'Submit sign up form': [
                                            {
                                                cond: 'Sign up server should throw unkwown error',
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Lookup for unknown server error.Invalid',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing up screen.Filling credentials.Lookup for unknown server error.Valid',
                                            },
                                        ],
                                    },
                                },
                            },
                            on: {
                                'Make sign up request throw unknown error': {
                                    actions:
                                        'Assign sign up request will throw an unknown error to context',
                                    target: '#Authentication model.Rendering signing up screen.Filling credentials',
                                },
                            },
                            onDone: {
                                target: '#Authentication model.Rendering email confirmation screen',
                            },
                        },
                    },
                    on: {
                        'Press button to go to sign in screen': {
                            target: '#Authentication model.Rendering signing screen',
                        },
                    },
                },
                'Rendering email confirmation screen': {
                    initial: 'Filling code',
                    states: {
                        'Filling code': {
                            initial: 'Idle',
                            states: {
                                Idle: {},
                                Valid: {
                                    type: 'final',
                                },
                                Invalid: {
                                    initial: 'Code is empty',
                                    states: {
                                        'Code is empty': {},
                                        'Code is invalid': {},
                                    },
                                },
                            },
                            on: {
                                'Type on confirmation code field': {
                                    actions:
                                        'Assign typed confirmation code to context',
                                    target: '#Authentication model.Rendering email confirmation screen.Filling code',
                                },
                                'Submit confirmation code form': [
                                    {
                                        cond: 'Confirmation code is empty',
                                        target: '#Authentication model.Rendering email confirmation screen.Filling code.Invalid.Code is empty',
                                    },
                                    {
                                        cond: 'Confirmation code is invalid',
                                        target: '#Authentication model.Rendering email confirmation screen.Filling code.Invalid.Code is invalid',
                                    },
                                    {
                                        target: '#Authentication model.Rendering email confirmation screen.Filling code.Valid',
                                    },
                                ],
                            },
                            onDone: {
                                target: '#Authentication model.Rendering email confirmation screen.Confirmed email',
                            },
                        },
                        'Confirmed email': {
                            type: 'final',
                        },
                    },
                    onDone: {
                        target: '#Authentication model.Rendering home screen',
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
                        z.string().max(255).email().check(signingInEmail) ===
                        false;

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

                'Sign up password field is empty': ({ signUpPassword }) => {
                    return (
                        signUpPassword === '' || signUpPassword === undefined
                    );
                },
                'Sign up password field is weak': ({ signUpPassword }) => {
                    return !passwordStrengthRegex.test(signUpPassword);
                },
                'Sign up email field is empty': ({ signUpEmail }) => {
                    return signUpEmail === '' || signUpEmail === undefined;
                },
                'Sign up email is invalid': ({ signUpEmail }) => {
                    const isSignUpEmailInvalid =
                        z.string().max(255).email().check(signUpEmail) ===
                        false;
                    return isSignUpEmailInvalid;
                },
                //Not sure about the following
                'Sign up email is unavailable': ({ signUpEmail }) => {
                    const userWithSameEmail = db.authenticationUser.findFirst({
                        where: {
                            email: {
                                equals: signUpEmail,
                            },
                        },
                    });

                    if (userWithSameEmail) {
                        return true;
                    }
                    return false;
                },
                'Sign up nickname field is empty': ({ signUpNickname }) => {
                    return (
                        signUpNickname === '' || signUpNickname === undefined
                    );
                },
                'Sign up server should throw unkwown error': ({
                    isSignUpRequestGoingToThrowUnknownError,
                }) => {
                    return isSignUpRequestGoingToThrowUnknownError;
                },
                'Sign up nickname field is unavailable': ({
                    signUpNickname,
                }) => {
                    const userWithSameUserNickname =
                        db.authenticationUser.findFirst({
                            where: {
                                nickname: {
                                    equals: signUpNickname,
                                },
                            },
                        });

                    if (userWithSameUserNickname) {
                        return true;
                    }
                    return false;
                },
                'User has confirmed her email': () => {
                    const user = db.myProfileInformation.findFirst({
                        where: {
                            userID: {
                                equals: CLIENT_INTEG_TEST_USER_ID,
                            },
                        },
                    });
                    invariant(user !== null, 'Current user must exist');

                    const isUserEmailConfirmed = user.hasConfirmedEmail;
                    return isUserEmailConfirmed;
                },
                'Confirmation code is empty': ({ emailConfirmationCode }) => {
                    const isConfirmationCodeEmpty =
                        emailConfirmationCode === '';

                    return isConfirmationCodeEmpty === true;
                },
                'Confirmation code is invalid': ({ emailConfirmationCode }) => {
                    const isConfirmationCodeInvalid =
                        emailConfirmationCode !== '123456';

                    return isConfirmationCodeInvalid === true;
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
                'Assign sign up request will throw an unknown error to context':
                    assign({
                        isSignUpRequestGoingToThrowUnknownError: (_context) =>
                            true,
                    }),
                'Assign sign up typed user nickname to context': assign({
                    signUpNickname: (_context, event) => {
                        assertEventType(
                            event,
                            'Type on sign up user nickname field',
                        );

                        return event.nickname;
                    },
                }),
                'Assign sign up typed user email to context': assign({
                    signUpEmail: (_context, event) => {
                        assertEventType(
                            event,
                            'Type on sign up user email field',
                        );

                        return event.email;
                    },
                }),
                'Assign sign up typed user password to context': assign({
                    signUpPassword: (_context, event) => {
                        assertEventType(
                            event,
                            'Type on sign up user password field',
                        );

                        return event.password;
                    },
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

        context.screen = renderAppWithNavigation();
    },

    'Press button to go to sign up screen': async ({ screen }) => {
        invariant(screen !== undefined, 'Screen must have been rendered');

        const goToSignUpFormScreenButton = await screen.findByText(
            /or.*sign.*up.*/i,
        );
        expect(goToSignUpFormScreenButton).toBeTruthy();

        fireEvent.press(goToSignUpFormScreenButton);
    },

    //Sign in
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

    'Make signing in request fail': () => {
        server.use(
            rest.post(
                `${SERVER_ENDPOINT}/authentication/sign-in`,
                (_req, res, ctx) => {
                    return res(ctx.status(500));
                },
            ),
        );
    },
    ///

    //Sign up
    'Submit sign up form': async ({ screen }) => {
        invariant(screen !== undefined, 'Screen must have been rendered');

        const signUpButton = await screen.findByText(/^sign.*up$/i);
        expect(signUpButton).toBeTruthy();

        fireEvent.press(signUpButton);
    },

    'Type on sign up user nickname field': async ({ screen }, e) => {
        invariant(screen !== undefined, 'Screen must have been rendered');

        const event = e as EventFrom<
            typeof authenticationModelMachine,
            'Type on sign up user nickname field'
        >;
        const signUpFormScreenContainer = await screen.findByTestId(
            'sign-up-form-screen-container',
        );

        const nicknameField = await within(
            signUpFormScreenContainer,
        ).findByPlaceholderText(/.*nickname.*/i);
        expect(nicknameField).toBeTruthy();

        fireEvent.changeText(nicknameField, event.nickname);
    },

    'Type on sign up user email field': async ({ screen }, e) => {
        invariant(screen !== undefined, 'Screen must have been rendered');

        const event = e as EventFrom<
            typeof authenticationModelMachine,
            'Type on sign up user email field'
        >;
        const signUpFormScreenContainer = await screen.findByTestId(
            'sign-up-form-screen-container',
        );

        const emailField = await within(
            signUpFormScreenContainer,
        ).findByPlaceholderText(/.*email.*/i);
        expect(emailField).toBeTruthy();

        fireEvent.changeText(emailField, event.email);
    },

    'Type on sign up user password field': async ({ screen }, e) => {
        invariant(screen !== undefined, 'Screen must have been rendered');

        const event = e as EventFrom<
            typeof authenticationModelMachine,
            'Type on sign up user password field'
        >;
        const signUpFormScreenContainer = await screen.findByTestId(
            'sign-up-form-screen-container',
        );

        const passwordField = await within(
            signUpFormScreenContainer,
        ).findByPlaceholderText(/.*password.*/i);
        expect(passwordField).toBeTruthy();

        fireEvent.changeText(passwordField, event.password);
    },
    'Make sign up request throw unknown error': () => {
        server.use(
            rest.post<
                SignUpRequestBody,
                Record<string, never>,
                SignUpResponseBody
            >(`${SERVER_ENDPOINT}/authentication/sign-up`, (_req, res, ctx) => {
                return res(ctx.status(500));
            }),
        );
    },
    ///

    //Sign out
    'Make user go to his profile settings from home and sign out': async ({
        screen,
    }) => {
        invariant(screen !== undefined, 'Screen must have been rendered');

        const goToMyProfileButton = await screen.findByTestId(
            'open-my-profile-page-button',
        );
        expect(goToMyProfileButton).toBeTruthy();
        fireEvent.press(goToMyProfileButton);
        expect(
            await screen.findByTestId('my-profile-page-container'),
        ).toBeTruthy();

        const goToMySettingsButton = await screen.findByTestId(
            'go-to-my-settings-button',
        );
        expect(goToMySettingsButton).toBeTruthy();
        fireEvent.press(goToMySettingsButton);
        expect(
            await screen.findByTestId('my-profile-settings-page-container'),
        ).toBeTruthy();

        const myProfileSettingsSignOutButton = await screen.findByTestId(
            'my-profile-sign-out-button',
        );
        expect(myProfileSettingsSignOutButton).toBeTruthy();

        fireEvent.press(myProfileSettingsSignOutButton);
    },
    ///
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
                      | {
                            'Display error':
                                | 'Invalid credentials'
                                | 'Unknown server error';
                        }
                      | 'Submitted successfully';
              };
          }
        | 'Rendering email confirmation screen'
        | 'Rendering home screen';
    events: EventFrom<typeof authenticationModelMachine>[];
    hasUserConfirmedHerEmail: boolean;
}>(
    'Signing in',
    async ({ target, events, hasUserConfirmedHerEmail }) => {
        db.authenticationUser.create(existingUser);
        db.myProfileInformation.create({
            userID: existingUser.uuid,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: existingUser.nickname,
            hasConfirmedEmail: hasUserConfirmedHerEmail,
        });

        const plan = authenticationModel.getPlanFromEvents(events, { target });

        await plan.test({
            screen: undefined,
        });
    },
    {
        'Renders signing in screen if user is not authenticated': {
            target: 'Rendering signing screen',
            hasUserConfirmedHerEmail: true,
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
            hasUserConfirmedHerEmail: true,
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
            hasUserConfirmedHerEmail: true,
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
            hasUserConfirmedHerEmail: true,
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
                    'Rendering server error': {
                        'Display error': 'Invalid credentials',
                    },
                },
            },
            hasUserConfirmedHerEmail: true,
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
        'Displays an error when signing in request failed unexpectedly': {
            target: {
                'Rendering signing screen': {
                    'Filling credentials': 'Filled fields',
                    'Rendering server error': {
                        'Display error': 'Unknown server error',
                    },
                },
            },
            hasUserConfirmedHerEmail: true,
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Make signing in request fail',
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
        'Signs in with valid credentials and redirects to email confirmation screen when user has not already confirmed her email':
            {
                target: 'Rendering email confirmation screen',
                hasUserConfirmedHerEmail: false,
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
        'Signs in with valid credentials and redirects to home when user has already confirmed her email':
            {
                target: 'Rendering home screen',
                hasUserConfirmedHerEmail: true,
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
        'Redirects to home screen if user is already authenticated and has already confirmed her email':
            {
                target: 'Rendering home screen',
                hasUserConfirmedHerEmail: true,
                events: [
                    {
                        type: 'Make user authenticated and render application',
                    },
                ],
            },
        'Redirects to email confirmation screen if user is already authenticated but has not already confirmed her email':
            {
                target: 'Rendering email confirmation screen',
                hasUserConfirmedHerEmail: false,
                events: [
                    {
                        type: 'Make user authenticated and render application',
                    },
                ],
            },
    },
);

cases<{
    target:
        | 'Rendering signing up screen'
        | 'Rendering home screen'
        | 'Rendering signing screen'
        | 'Rendering email confirmation screen'
        | {
              'Rendering signing up screen': {
                  'Filling credentials': {
                      'Filling user nickname':
                          | 'Idle'
                          | {
                                Invalid:
                                    | 'Nickname is empty'
                                    | 'Nickname is unavailable';
                            }
                          | 'Valid';
                      'Filling user email':
                          | 'Idle'
                          | {
                                Invalid:
                                    | 'Email is empty'
                                    | 'Email is unavailable'
                                    | 'Email is invalid';
                            }
                          | 'Valid';
                      'Filling user password':
                          | 'Idle'
                          | {
                                Invalid:
                                    | 'Password is empty'
                                    | 'Password is weak';
                            }
                          | 'Valid';
                      'Lookup for unknown server error':
                          | 'Idle'
                          | 'Invalid'
                          | 'Valid';
                  };
              };
          };
    events: EventFrom<typeof authenticationModelMachine>[];
}>(
    'Signing up',
    async ({ target, events }) => {
        db.authenticationUser.create(existingUser);
        db.myProfileInformation.create({
            userID: existingUser.uuid,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: existingUser.nickname,
            hasConfirmedEmail: false,
        });

        const plan = authenticationModel.getPlanFromEvents(events, { target });

        await plan.test({
            screen: undefined,
        });
    },
    {
        'Renders signing in screen if user is not authenticated': {
            target: 'Rendering signing up screen',
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Press button to go to sign up screen',
                },
            ],
        },
        'Fail to sign up as every fields are empty': {
            target: {
                'Rendering signing up screen': {
                    'Filling credentials': {
                        'Filling user nickname': {
                            Invalid: 'Nickname is empty',
                        },
                        'Filling user email': {
                            Invalid: 'Email is empty',
                        },
                        'Filling user password': {
                            Invalid: 'Password is empty',
                        },
                        'Lookup for unknown server error': 'Valid',
                    },
                },
            },
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Press button to go to sign up screen',
                },
                {
                    type: 'Submit sign up form',
                },
            ],
        },
        'Fail to sign up as both email and nickname are unavailable': {
            target: {
                'Rendering signing up screen': {
                    'Filling credentials': {
                        'Filling user email': {
                            Invalid: 'Email is unavailable',
                        },
                        'Filling user nickname': {
                            Invalid: 'Nickname is unavailable',
                        },
                        'Filling user password': 'Valid',
                        'Lookup for unknown server error': 'Valid',
                    },
                },
            },
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Press button to go to sign up screen',
                },
                {
                    type: 'Type on sign up user password field',
                    password: generateStrongPassword(),
                },
                {
                    type: 'Type on sign up user email field',
                    email: existingUser.email,
                },
                {
                    type: 'Type on sign up user nickname field',
                    nickname: existingUser.nickname,
                },
                {
                    type: 'Submit sign up form',
                },
            ],
        },
        'Fail to sign up as password is too weak': {
            target: {
                'Rendering signing up screen': {
                    'Filling credentials': {
                        'Filling user email': 'Valid',
                        'Filling user nickname': 'Valid',
                        'Filling user password': {
                            Invalid: 'Password is weak',
                        },
                        'Lookup for unknown server error': 'Valid',
                    },
                },
            },
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Press button to go to sign up screen',
                },
                {
                    type: 'Type on sign up user password field',
                    password: generateWeakPassword(),
                },
                {
                    type: 'Type on sign up user email field',
                    email: internet.email(),
                },
                {
                    type: 'Type on sign up user nickname field',
                    nickname: internet.userName(),
                },
                {
                    type: 'Submit sign up form',
                },
            ],
        },
        'Fail to sign up as email is invalid': {
            target: {
                'Rendering signing up screen': {
                    'Filling credentials': {
                        'Filling user email': {
                            Invalid: 'Email is invalid',
                        },
                        'Filling user nickname': 'Valid',
                        'Filling user password': 'Valid',
                        'Lookup for unknown server error': 'Valid',
                    },
                },
            },
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Press button to go to sign up screen',
                },
                {
                    type: 'Type on sign up user password field',
                    password: generateStrongPassword(),
                },
                {
                    type: 'Type on sign up user email field',
                    email: internet.email().replace('@', random.word()),
                },
                {
                    type: 'Type on sign up user nickname field',
                    nickname: internet.userName(),
                },
                {
                    type: 'Submit sign up form',
                },
            ],
        },
        'Sign up failed due to unknown error': {
            target: {
                'Rendering signing up screen': {
                    'Filling credentials': {
                        'Filling user email': 'Valid',
                        'Filling user nickname': 'Valid',
                        'Filling user password': 'Valid',
                        'Lookup for unknown server error': 'Invalid',
                    },
                },
            },
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Press button to go to sign up screen',
                },
                {
                    type: 'Type on sign up user password field',
                    password: generateStrongPassword(),
                },
                {
                    type: 'Type on sign up user email field',
                    email: internet.email(),
                },
                {
                    type: 'Type on sign up user nickname field',
                    nickname: internet.userName(),
                },
                {
                    type: 'Make sign up request throw unknown error',
                },
                {
                    type: 'Submit sign up form',
                },
            ],
        },
        'Signs up successfully and redirects to email confirmation screen': {
            target: 'Rendering email confirmation screen',
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Press button to go to sign up screen',
                },
                {
                    type: 'Type on sign up user password field',
                    password: generateStrongPassword(),
                },
                {
                    type: 'Type on sign up user email field',
                    email: internet.email(),
                },
                {
                    type: 'Type on sign up user nickname field',
                    nickname: internet.userName(),
                },
                {
                    type: 'Submit sign up form',
                },
            ],
        },
        'It should go to sign up screen and then go back to sign in screen': {
            target: 'Rendering signing screen',
            events: [
                {
                    type: 'Make user unauthenticated and render application',
                },
                {
                    type: 'Press button to go to sign up screen',
                },
                {
                    type: 'Press button to go to sign in screen',
                },
            ],
        },
    },
);

cases<{
    target: 'Rendering signing screen';
    events: EventFrom<typeof authenticationModelMachine>[];
}>(
    'Signing out',
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

        const plan = authenticationModel.getPlanFromEvents(events, { target });

        await plan.test({
            screen: undefined,
        });
    },
    {
        'It should sign out user from my profile settings': {
            target: 'Rendering signing screen',
            events: [
                {
                    type: 'Make user authenticated and render application',
                },
                {
                    type: 'Make user go to his profile settings from home and sign out',
                },
            ],
        },
    },
);
