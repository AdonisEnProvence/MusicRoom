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
    renderUnauthenticatedApp,
    waitFor,
    within,
    fireEvent,
    generateStrongPassword,
    generateWeakPassword,
    CLIENT_INTEG_TEST_USER_ID,
    renderAppWithNavigation,
} from '../tests/tests-utils';
import { withAuthentication } from '../tests/server/handlers';

interface TestingContext {
    screen?: ReturnType<typeof render>;
}

const existingUser = generateAuthenticationUser();

const authenticationModelMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QEECuAXAFmAduglgMYCGBA9jgAQC2ZEYANgHQCSO+BxD+AXqfhQDEAWWIBrMJVSwwAJ0rEM2PEVKQFOCJVm5684gAcD3EuRyJQBsrA4DzSEAA9EATgBsAJiYBmAOwAWbwBWAAYARgAOMKCPN28AGhAAT0QAWn8wlyY3AO8wj19vfxdQsIBfMsS0LFwCUzsaOkZWdk5uPjMRcUlpOSkcRRqVU3ViTW1dPsNjVTMLECsbOYdnBFSPF18fFxcIjO9Ytxd-IN9ElIQw-xCmTZDfU4Or-zcQ7wqqpVrZhtp6ZgASpNZPgcFBKJgyNRJLBCDpcF0JFIZPIoGRKOh0Zh8LBKAZZGQAGb4BgwsDoAhg3GEgnUCFQyRjLQ2KBUMgYeaLWwUearUI3EKxFxhYL+KL+XxnZKINz+bI7EpXI6CuIuD4garKOr8CiNf5MIGaOSg8Es9hgyiw+E4JgAMRJ3AtcMg3y4sDtDpNlGJjAg7vtDEd4LA1GIJMEAGVUAAjagcS34Vle0Hesiyaic6zc+ygVapfIhCJMMIPEIhNwRCK+EK7c6IMJhN63CIeVvC-wFVvqzXfeq6v7NQ16L1mkfO3AewNe530FRuydB734X3+z0WkNhhiCAAqSQMkl1o4tKY3JKXvszSzsvLSwS8HiC7mCORyEU8dYQLnCxYOBQiQW8e5G3KSoNS+YYdSoAdAWBEdE3NU1xxtANFxnV0GFXKcLR9Bg-QXL0DGIWBYAAdzTCBIxjON0ATJNjyoQk0wzBwuWWXM0kbcsmFOOI-AiXZ+LyD9MlbJgNjCNx+X-GsQn8btwO1Mw9UHWCLSPRDrXwp0dFnNpMMXHC8JQgiiNI8idz3A8qHUygU0I4iyNkLRDMvbMbzWK4tgiQCYkk8tHweIJhN8Nw3CYXx-wrQV-xCq55KGRTfiaGCjRBNT4LHTTjO0l05wwrTwUM2BBAgCgwCYWB0DUJgewgpToINVTTQytSkIKyg0Ly-SvSK1y2KcRANjlBtfAk-jRsFXwXGEjwmxiXwPE4-i33yeKtR+ftksa1K4LojSwAnbLwU6vT2qKxEYRa8EUx0ABHVA4BowlNz668Vg4yUwluUaxUyf8RROYTAjCoJ-ECCaWzcRtfDW3tIOUlLh3SvbLTaodjTUuQADc+jkAlZEo2N4xslNGPTV6eXetZ-zlPw-uFAGYg-DwTjlFxAOKF5xt2GHQNqxLNv1dG0ualGrQOnASrKiqqvQcr+Y2qCtuF3aENR60KZzAaEErLIO2OctG34r8EmlBBRXlMH8g8IoPD2NxYbqpKhaa2i1fFhEAAUdGIyhowwTEqExSg0QxdEzSkAx1YlzX3MKIsDjebzCnZsUImE2Usj2FwbcrQJoncR2BaVl2duRtXUCjj3kLXY6dPQ7qLV6eR2EIMQBmhQnqLdyPU3Jlis361YCyyWJJvyV4WaiDORW+h9okWiSQqLxWEe2pHRYrqu2qOjr6669rm8oVv2+ITvd33ShD3g3uj5PjvJBcger0p9jLjyLJqz8Ioa0lIIwmEjnIs-5+IViCBWEKBwV59hLipMum8vSV2jodWue9cqnV3kfeyZknJd2JjfJBZNmKWEHm9N++RvBhUiP-F4-9fKCmZpkbwTBwiSWhnbKGexoHwwaircuiDt5ZVQSdfA85MEojxKZRyFEL5WR7kgrBUjyLnlwrHKmIoSy3DiIcTYsp7huGZqELYJsbZgwiDWd4fMFKr14a7GySDq7tREWI1BR9TxbijETGiEdCFMTUeQlmYVvDHBCicIBsoPzuC2LNTO+wgigwktw+qys7FXV7o43ezj8riNxqGcMsir7WQIVHNxeSGAqIgP47WIoDjFklEcUGIV7jxOEkULOnk4ieG8pkJJzs4EbzdgI5BNcsJ13QaI-KAAZMgZAxC+PkKgHA7cyAkWstjXGsh8Z4O8cUvuxCFikNftU2IQRthvgfG08shRmaSi8OWe4IU9ERVOL0wW-SMYIKboIiWTj956SljgcqlVqoKxgWvPhnzwQOJ3sIv5Ez4DPzcuolszCAIvDbDJAxZs6ZiQil0go9y1RWISjYlJ8DBlfOGb88ZboLryKjndB6lUMSYAJCRfoyzVmUDxmmKpqxZqFh8J4B4BRgjHDiB+XWWjWwyWCScXmnwSVgtseS+x3yvY+1xP7Ckupg6h2DhHFM1c+WIAeMwyhEkSx00fEFM2Vx-zbHAQcYo4D-yWMVetZVZKBnuI6hQYk6Z4YZOEU0AFQLZby2sV60uPqyl+pwAG0MSlg2jL9fQE15s07ZAOOYoI-FwHFGEt+CSrwpoFlbH+V5sDEYfO5XGwg-r8CBuTTC1NDb6AWUvrqBtCam1JoaO2x+y5VGIqHogNpdzvB5H-rsShU0PzpCbAXO2xQwEpyreC12vqe2JqDa21CobPHdx3X2+Gg69kZpZiFYsJY3yVkiJsQIC6mFMH4h2CSHZzGmIVWBJVPDvW1u3Y25tDRq5hpliCqN-6Y2AfrcB-th4kIZoffeR8gEdgBByA8BdHDs2BFbGDThU6N0qtjZueNu6W3WjpUB3tIHdSMset6F6o6yHa2CJkJgHZAo1PEv+BdFYvAvGCZQk5AFhQVFAjgJoCKUBQeSfqNgtguC8Eghmk4NwqzTqml-E4wQF2hDlHbG2ZZ+KzWtiRgDIt6TQmGchgCYVFqhReJa2S6czbpGOD4e47NwjhCrFDSzMHrM2RTahOFLjU1FXau41gEBSQZvzDEnwIV-4jWrA8LFFx3BGdbHK9s5i8hBfeSFtJYXpwReyag6Lu9YtsCxipiATAACicacR1oMOgC4JCX5azzGwlhpwQkVh2G+LL9YKFccoWWSSEpYgdmKzW0rYt90VZpVVqLw6jKoLqzgBr3AmutfI+10E+38CVNY0c-rAFwq8VknbCKVYPBFslK+uImRQazXiQBRb69a2hdWzlXS8KzpbcbsGMpLQzsXZ60it+qQsO3anfdqslYFpFtkq+haRQAtgw2A7YlnroMldVplH5mTKvg4qVT2LAA1RriXQrMJKMEY2AEihgyBrPeJ5ijglm4-cX7EKKX7RQW2ynoOVwxbKYlihXgSz8grFWGs7mLhVlHnkDsGx5uPiF6klbQjxfrapzV1B2DpFxYS5dvrHEGxGYWizTmIR-7O+CsKMSD5UshTMwtPXqqyuA7GcDyLBkwftXN+RKHjWmCeyUU5WyuIQyde6wc3r7lUh0OyPkUIQ03zeD2IAu2PhQag1kpkSUhQ-cDIB4b8LxvJe4SpxHpyUeDuJfE1nh8gpjh54L3a-8pzKHPj2JrqdIEPVwwUyT-hrVa9reDxt0PUvd7N6a-Ttv1v08ARuIZssU09H59tRcRaDrwGFkfLNMUf8q--YD3PoHDcG-bdTav2XIoiydkdwbF3R-6zVkc0UFNHxM7t5B4Dfstu7IHmggvibmDrLg+FQqWOWGjirpKlxCzM7iFASlOsRoTpPn0ktqTrPuTrCvXihOoL1JvlTGKF4M5lerENEC2N5DNFcFnn-LJJJFWAEOAUQaLiMnXjAbLlNKcpsPan9P-EUL-ggIUMwizO4CjvTHJHgU7G8oQTPnwX9iFusvIDyrIJbmAEIWFF+BKIKGPAtNWFIWPPLjWDbI+EcLsPEjweoVSsLiiDjDoZsmmEwAACI4jGDEBJDcqeF6H1aNbQENyJadhTbuCvChQlgir+DMw97ZAD55pKgX5OGQouF2LaFBH4w+F+EMABF5FeEACqSy0mXKbhGy+MkREUPgLwsoI23kEolhOwRmeaVsIqoMRKE+Kh1amhvB2RqquRuhBRsA-hgRuhiWgEXgRQzmzRgBlhVYpyRwYolCLYsQ-4mRIuwx1eoxwRTAR6HAcszIqAhAhAcAsAhIqAgYKerEbG-WVY3Epw3eMQ3kioH4eQZYPgts0Q-OsoQQOxNePyrhBxtRVB8OqOKW9MDYkhz2ZsNsRwtwwSMQBKVwjSwJd+MckJ2s+YUQWQohv0DhjMH4oUNwD4KxWBeacQEQWJKM0K9+Qej+OSLcRAp80I+hyGfgWQSc+QMUU6mxwkrq2wT4EkmBPSyhxcm6-uDJ6q-B8+LJriEi98Z85U6+523J9Rgo4Cs6KKWuwpokkM-EjYoQX4xw9JW8VKFOZBypfQqpnJoRB2TAAAcuyQ-Anh1l1shuSWwXduYSUONpcIUFsPkL5qZgtBkJaUMuVg-gfKycfO6Wqa3udq6UmbZu1ossQA1iSMQNGFbrDmOpcJJKsSWP6QUIGRnO7vErKB+lECutGZSrGcyfGXaWyW3A-CmTDqnnDtUu9n6cjgGeAjPEWOAqDGDMUENI2VCvKdSjAYfCqemQYbicPNQmJJPKNFYb9EDH4K+tNmDHKhFPntOeklAVklToog5JHiwPFsuYWY8fWPnszscAzHeuWIwhKFxuDNWFauYr0b+kTlPmoVkYySQUbvOQmavkwBqd2Q8Vdo+S2M2FPEvNWAicfsBFjoWG+OAs8mAVKaSsFkMaBWLgIUqampeTgk1k6ambHlefHu1knt6SufWLKMwrEc6tcKNPnkGTbBJHUsEIKAcIUA0iecRQqXGRgm2ZInRVRXttHrRZRZ6SRGAOID6YEB7gcH4FPOzKDMzAStkDNpEAtFcNnqJbOTaRBVJVBdRbBYcjbsWZxnljbJGYJLpYieXgZTljkMjmAmZdaaQZZeRRIq-sxZcItPLv9LQgvJPMzKwljjsBicIfon5c2eEa2UFbkpuFyaFfkNECwsZeWFDHmlOlIfbMWK+CWBJMKOYSlWeRLgmXTgzjlU+eFPnh2MUGagFJKteoSu1aXjbLVUyWlZJRlToZDjZS1m1ontQMnj6UULcOfjnDnJ4M8MJPkLlh2DSbJDEKDINWBaRelYuKUllRNUdmeCdnJRvvefBcWfntkK8dWOcmWG5RcA2MifvgqAXCVXtSRYqYdYghIrttDpNcdriFmTmUUfmXeT2UWRJBsAtf+EtbEItJznaotIPkcCnD9M8ECfhdGtPiBeZQFWRUdYDeNZdZqTla8CIYtdritaja9c7l9DbEUA2D3sEjsD9eJS2SNaTZlSSMhpkF9PcItIVYwSVR+LFHUhWCcJEIWBwlzXOY-tMrMvMhypUWsrIO4SUSEbechuDNxF+FNBwcKLbDcrEFxqjr5jjgrXjcTsBbsWJUrQfCrXMlHGTOrSsprdrWMTZT6W+NxPbJNA8GKG8MzCtMXhWK8JVXzgTn0dKaRrfnKf5eBcrTMm7X3J7VUeCV4TBfrZQtxEeRuX+RkMzFFLcP8TEKHeEP+aCvbYMc4U7RZWnare7WmFnd7TUbyjlSzF9MEucmil+N5YYiULcL3eYsUEvLjfHQRQTY7UTanV1ILVDOuePFudPGbErsWCAoUCJGKBKFzYLbuVYZuZPNuZvXlR9iqA5mKuPgBfgaoQ3RDuRievRtZGeU0NlddfZa2IhdcGWWPqxWHR5k5loi2GGferNHhTPfjQ7bRpRqBh-fQNBU1d-e5PQR7hkLsC6sgabK9TnCwkbWjrmiWnSXbUBU-XWi-fBnukNYOl2UwAAMJNCemMX3F2XuR5ANhiQ0ILRR2LRSgXD5jfhQxVUiYWqig7HwOnpUb7XTif0TXMP0CemnaoMw0PnmwNjM28NbErWCNpByieA+bO5ioiZxDT3339EylkZniv0Ibv10MKMU1NYRi5HPQkjqDBw+xWCaAZrfFFhRQSGZYml4OuCyFBNMKNHszQOWMJ1WZejSNv0p0HrIN+2hWAR7ApFM1+Cuqm3PoBAGUPinAZAYHO5x2xOz1wNwZ0b2PJPyPpqhWth5pcbhCQJ5BAOhNrCARfQlDCgCqRCyh2xSPVMIOIaaTMM1PqDuJ+OhRZAfaPWgJxD6PSGjxjRFWeRInuoVOwOUOJO1PGqNOmItMAPtOBDANCMShUKlArWNgFaLay4j7fRiEkmSELqBRcagwj5vo1g-aSZAA */
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
                emailConfirmationCode: undefined,
                isEmailConfirmationRequestGoingToFail: false,
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
                    emailConfirmationCode: string | undefined;
                    isEmailConfirmationRequestGoingToFail: boolean;
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
                          type: 'Make email confirmation request fail';
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
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'Screen must have been rendered',
                            );

                            const emailConfirmationScreenTitle =
                                await screen.findByText(
                                    /confirmation.*email.*address/i,
                                );
                            expect(emailConfirmationScreenTitle).toBeTruthy();
                        },
                    },
                    initial: 'Filling code',
                    states: {
                        'Filling code': {
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
                                                            'email-confirmation-screen-code-field',
                                                        ),
                                                    ).queryByRole('alert'),
                                                ).toBeNull();
                                            });
                                        },
                                    },
                                },
                                Valid: {
                                    type: 'final',
                                },
                                Invalid: {
                                    initial: 'Code is empty',
                                    states: {
                                        'Code is empty': {
                                            meta: {
                                                test: async ({
                                                    screen,
                                                }: TestingContext) => {
                                                    invariant(
                                                        screen !== undefined,
                                                        'Screen must have been rendered',
                                                    );

                                                    await waitFor(() => {
                                                        const emailConfirmationCodeIsEmpty =
                                                            within(
                                                                screen.getByTestId(
                                                                    'email-confirmation-screen-code-field',
                                                                ),
                                                            ).getByRole(
                                                                'alert',
                                                            );
                                                        expect(
                                                            emailConfirmationCodeIsEmpty,
                                                        ).toBeTruthy();

                                                        expect(
                                                            emailConfirmationCodeIsEmpty,
                                                        ).toHaveTextContent(
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
                                                    invariant(
                                                        screen !== undefined,
                                                        'Screen must have been rendered',
                                                    );

                                                    await waitFor(() => {
                                                        const emailConfirmationCodeIsInvalid =
                                                            within(
                                                                screen.getByTestId(
                                                                    'email-confirmation-screen-code-field',
                                                                ),
                                                            ).getByRole(
                                                                'alert',
                                                            );
                                                        expect(
                                                            emailConfirmationCodeIsInvalid,
                                                        ).toBeTruthy();

                                                        expect(
                                                            emailConfirmationCodeIsInvalid,
                                                        ).toHaveTextContent(
                                                            'Code is invalid.',
                                                        );
                                                    });
                                                },
                                            },
                                        },
                                        'Server failed to respond': {
                                            meta: {
                                                test: async ({
                                                    screen,
                                                }: TestingContext) => {
                                                    invariant(
                                                        screen !== undefined,
                                                        'Screen must have been rendered',
                                                    );

                                                    await waitFor(() => {
                                                        const emailConfirmationCodeRequestFailed =
                                                            within(
                                                                screen.getByTestId(
                                                                    'email-confirmation-screen-code-field',
                                                                ),
                                                            ).getByRole(
                                                                'alert',
                                                            );
                                                        expect(
                                                            emailConfirmationCodeRequestFailed,
                                                        ).toBeTruthy();

                                                        expect(
                                                            emailConfirmationCodeRequestFailed,
                                                        ).toHaveTextContent(
                                                            'An error occured during submitting.',
                                                        );
                                                    });
                                                },
                                            },
                                        },
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
                                        cond: 'Server fails to respond to email confirmation request',
                                        target: '#Authentication model.Rendering email confirmation screen.Filling code.Invalid.Server failed to respond',
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
                    on: {
                        'Make email confirmation request fail': {
                            actions:
                                'Assign email confirmation request will fail to context',
                            target: '#Authentication model.Rendering email confirmation screen',
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
                'Server fails to respond to email confirmation request': ({
                    isEmailConfirmationRequestGoingToFail,
                }) => {
                    return isEmailConfirmationRequestGoingToFail === true;
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
                'Assign email confirmation request will fail to context':
                    assign({
                        isEmailConfirmationRequestGoingToFail: (_context) =>
                            true,
                    }),
                'Assign typed confirmation code to context': assign({
                    emailConfirmationCode: (_context, event) => {
                        assertEventType(
                            event,
                            'Type on confirmation code field',
                        );

                        return event.confirmationCode;
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

    'Type on confirmation code field': async ({ screen }, e) => {
        invariant(screen !== undefined, 'Screen must have been rendered');

        const event = e as EventFrom<
            typeof authenticationModelMachine,
            'Type on confirmation code field'
        >;

        const confirmationCodeTextField = await screen.findByPlaceholderText(
            /enter.*confirmation.*code/i,
        );
        expect(confirmationCodeTextField).toBeTruthy();

        fireEvent.changeText(confirmationCodeTextField, event.confirmationCode);
    },

    'Make email confirmation request fail': () => {
        server.use(
            rest.post(
                `${SERVER_ENDPOINT}/authentication/confirm-email`,
                withAuthentication((_req, res, ctx) => {
                    return res(ctx.status(500));
                }),
            ),
        );
    },

    'Submit confirmation code form': async ({ screen }) => {
        invariant(screen !== undefined, 'Screen must have been rendered');

        const confirmationCodeFormSubmitButton = await screen.findByText(
            /confirm.*account/i,
        );
        expect(confirmationCodeFormSubmitButton).toBeTruthy();

        fireEvent.press(confirmationCodeFormSubmitButton);
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
    target:
        | {
              'Rendering email confirmation screen': {
                  'Filling code':
                      | 'Idle'
                      | {
                            Invalid:
                                | 'Code is empty'
                                | 'Code is invalid'
                                | 'Server failed to respond';
                        };
              };
          }
        | 'Rendering home screen';
    events: EventFrom<typeof authenticationModelMachine>[];
}>(
    'Email confirmation',
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
        'Fails to confirm email as code is empty': {
            target: {
                'Rendering email confirmation screen': {
                    'Filling code': {
                        Invalid: 'Code is empty',
                    },
                },
            },
            events: [
                {
                    type: 'Make user authenticated and render application',
                },
                {
                    type: 'Type on confirmation code field',
                    confirmationCode: '',
                },
                {
                    type: 'Submit confirmation code form',
                },
            ],
        },

        'Fails to confirm email as code is invalid': {
            target: {
                'Rendering email confirmation screen': {
                    'Filling code': {
                        Invalid: 'Code is invalid',
                    },
                },
            },
            events: [
                {
                    type: 'Make user authenticated and render application',
                },
                {
                    type: 'Type on confirmation code field',
                    confirmationCode: '-- INVALID TOKEN --',
                },
                {
                    type: 'Submit confirmation code form',
                },
            ],
        },

        'Fails to confirm email as server failed unexpectedly': {
            target: {
                'Rendering email confirmation screen': {
                    'Filling code': {
                        Invalid: 'Server failed to respond',
                    },
                },
            },
            events: [
                {
                    type: 'Make user authenticated and render application',
                },
                {
                    type: 'Make email confirmation request fail',
                },
                {
                    type: 'Type on confirmation code field',
                    confirmationCode: '123456',
                },
                {
                    type: 'Submit confirmation code form',
                },
            ],
        },

        'Confirms email successfully': {
            target: 'Rendering home screen',
            events: [
                {
                    type: 'Make user authenticated and render application',
                },
                {
                    type: 'Type on confirmation code field',
                    confirmationCode: '123456',
                },
                {
                    type: 'Submit confirmation code form',
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
