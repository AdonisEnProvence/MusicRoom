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
} from '../tests/tests-utils';

interface TestingContext {
    screen?: ReturnType<typeof render>;
}

const existingUser = generateAuthenticationUser();

const authenticationModelMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QEECuAXAFmAduglgMYCGBA9jgAQC2ZEYANgHQCSO+BxD+AXqfhQDEAWWIBrMJVSwwAJ0rEM2PEVKQFOCJVm5684gAcD3EuRyJQBsrA4DzSEAA9EARgAMAVhdMPbgEwAbACcfv4eAYFBADQgAJ6IQW5MQYkAHAEALB4eqRkA7JkBAL5FMWhYuASmdjR0jKzsnNx8ZiLiktJyUjiKFSqm6sSa2rpdhsaqZhYgVjZTDs4I7l4+-sGhfuGRMfEIAMype0wuB3l+QWcZex5+eRklZUqVkzW09MwASqOy+DhQlDYoOw-gDCDpcEwAGL4BjcEFgyDPLiwKEwuH-ABm+EYEBR0Nhv3+YGoxBhggAyqgAEbUDgA-BAwmUX6UDFkWTUaazWwUaaLFwRPw+a5uIJ7DIZFweO5+HaIPLpJh5PYBPZuZV7FwXW4PEDlZRVfgUWrvJhfTRyJmA4H-WAIiH49GUBH0FTI1EEkFYnF4tFM4mkhiCAAqsQMkmN1qZLIDMNZ2IYEC51h59lA-Lu3g8WVSQVS2QFqTyHjlS3c3kFuZy6QCeRcqV1+ue1WNb3q5r0VoZNtB4JwHqdLqRDF9nsxCdxA6ZBmIsFgAHd2RAKdTaeh6YyQSy2Rzk3M7HzXAEBcl3AEPEEAqq8kEXKWXFcAkw3OKxW5RSrAvdSnqnv0jVQbafN8Xabra9r9o6TJDm6I5Tl6E6jk6M5zousjLqG4aUJG3bRlQKELku8Y4nuqaHksZxBEwhwPtkj5uAEor3gEhzHCk2qJAqF4Nj+Tb-mYJrtiBIJRiJEHwf8MFNEhTLeomsCCBAFBgEwsDoGoTB8YaAlAWawm2rhYl9hJzo6K60kmXJuKkfM6aIH45xJKkzkeOKD57OKAT3i4fgZEw4peCED5asEPGPH02mvHUwEWj8ImGeBxlQfCZnDjJCE+m0Egbj2LI6AAjqgcDrhigY2QeCyuMq3iSvmaqSuEt55KWewFP5HmNeKoSpG46SNn+kWttFemxaBPZ2sZHaWiJcgAG5dHIsjsiuNJ0qJ-zbuynIONytlOFVLFKkEGR+C4dyubVJZxPZ6p5Ewx4CpeNzSm4J39RFLxDaaU1xQZYG9mAuCKcpqnqegKlaZ9gHDT9Y1WhB5W8pVSzqi1dZ+RknjHuEta1Xs70GlDgkxZ28X-RNgM4IIAAKOhzpQVIYOgxrM5QUBkJQrPWlIBgA7giNpvtZYZFRqTuO+go3OcpYi1RGTBG4Z23p4LgPgTzYAcTI2k39PaoLzFMOn6KWIrB6X-J08jsIQYg9NQYArWuOU86yW0C+Rp3NddSxFndmQebceznEWtbq-xUXffpOVMvrfOQcbkmpWbJmW5Q1u28Q9shmGEZUNzsep+nduSFZ7vIwcRwChEda5mKqS+aWp0hD45y3g5ao5JkYeDdDkejWTesG+JyWJ6bFkj1IMjyARaHLpSq3rvnvM7ttlgpntiybEcr23L4ext5j-iNzcT7HadOQqrmHnFLxA1E7psMDzHQ9JQnplj-g7oT6nM9LtnWE4SBC7H+s5CLoWIomMudl9hiyYCdHIWp9770vF7XYfhcjeHrkWK4kR-bfnCoTFsvchL911s-OOJkpKfzgt-KelBYxBnnk7Jertdw7XXhVaBgQKzZHqrkCUrkrq7FVgcZIvhMYSnfGdN6t8PpEK1o-MhIJY6G3jmOd+5lqHm0ngtEkZJMK52dgXOhDCIFJnYfuJG0D94eHupjU6NZpG5nvNmI4fhNQFAlEWF6eRu73xhlHdaLtVGUKThZAAMmQMgYhY47m6LbMg8485zQWrIJashHZrW7C7FeUChZqizHcVUuNeruNSC1M6T5fLqlVnkV6Cpzx+PkQ-QJCVgnDzflQ5EwMcAqTUhpSGzSAmkOjsol+lNQkf2RHk-kqNvatQVMcW45wryeBFjkJpmsWkjKCSojp6iukjiypIFhBUipqU5pgJa854k4ESVQRa7IZmIFalRL8NcBFamcqWOpfl67qgcnXNYYVfxyK2cMnWoyLbjKBrTOAsAGZMxZhzdmnMObcxZKo55KMVi+EiBsLYwR7x5lSHA86QdXlBAvPjXUdz6DwAcIM8Fpo2C2C4LwAC2KQ73TFmcBBVKQjRHmW1Q4tcDinXVPvTZOkIXTX+JgMg9s47YvcKgxAmNVTURFqrW4kp6yh1kYQ5lJDIVBJCRPQ52irLaIYawCADAwAqrOKS0UJ0zitSuCdLy3s6x3XOvkcIF57HSojiauVUKKEWrCVoyyiETK2rYLNdlEAmAAFE9EMGZAi4kBh0C7DXpYwW-IUhClzBKquGR0h7FLLmUl9ZJSK2qrcBUIavpht+hG81nTo1fzfta+NGaGhJu4Cm9NgYs3MhwMO-A5iC1kWRl8qiKRfZlquCgmt5w2KakVhcLwzkQVMplX3U1bSu0HJ7TQvtcaJ4JqncmlVT1kh5jyAqEIa7aw-PCEwDY+rAi9QvK24hJNw1mv2YOC9Vrr1v1tQANXvRY+d0CzqBGONmd1L7fLuOrd7TIpLizy1VuLEI4RAMKNaeTMD0EIOxp9AOsqCGN6uG4sKXwYoJRShlKWcIRwCgevPCdCUt5SPbJPRR1+56pmXvUf2iev90J2odU6k8CoHLSkzOqMU94VR3Vesgi4qoPK5GE7KjtoHxPgck5B2jsnQGzyHcmpg1NbNEXwNm6gub80zA4VYoWWpizUWIwxSpqsQguJOPdJuVbrgXiCMZ49IHT2UZNpo3t0moPqLkymxN8G52MaWFSzBgXjwFBC7Kb2D5Mb3W3eEd8rkdVxfbXDIyEyo2WZo-JEymWmBwZHUpv5XrDjhB8h5O85Xg7PlcgxY6HlPCeAa8B0ziXzNUbaxPGTb9MsqovEKZW55LzXlvPeU628IjuE2BEdIyp5vawS2Jlr3bVtXp9Ftw6u2LxXleaN3YIskgYdyIkPMDFgg3wIRrI9jWn7NaNhJlLUmHVaGtdi3y9Zv1ngiGEZU3kUMStcoHFZVxruKM7Ul0esOGW5c4b57Mfk3v7c+y1F8-k3X1MOIxCUhPyPjXEkTqe815CPNkApx1DHKf8km0qMtL7cyMV6uU72oRVb3V6qqVx7rToc52UtiZPOUn87SeyJgAARVzxhiCxHofrwX2WR0aLSkj5BEv-C1ucuxoR9lNh+Wej5QTqpQgg9BUa8HC2muJW14E3XFv0lG5NwwM3keDcAFUcAJKSQCCPAv7cpEd+gkl-CpSN2uFmAUJwxYFa+Rr0TXPJrh9kHz+PgvjewFN+bjPIufOb1arYhUTvc+u8bvWLMblaxb3yK1Cvt2q9h52eny3TAmEcHBloWAqBCCEHhRiVAsJPO7VF-ZTGVF0f-YcgqO4aqECbByGIvMvkTq7t8YasHobg+Q9DxCHXtfUnpK2wxCXIQpeXnfG+XKxCCfGKxfTzClHFnv1B3DjbWfyUVf0Fh33b1cErSFFfWbWl0ALlzQTVH8i8BvEG0I1x3H0W3+j2WW2SzShTjoSLkzhUhYHtWFwpxQP2E1U8DrnWTFBL2w2ER6lJXPECFrH3krRL1IJD3aUoNJ2oNoS6DoPtm6xyy80LXIhVG8BC3rlcipXgSpXvGVAP2PCLAclO1eXEJf0kPuxhxkLfkLiIAzgUOtxnSYAADk7Di4J0c081sUrxSVrgZR-BeMbxvVhE8wqJRRVZsxsZeoCgzCECLDocLMycaC5C3D6D7MR0XDUilVXNuhiAk0YRiAqRFM28i1EAPt8D-DbgDtgjXAQgkhxZrhjp65JQHJYiI0KDLDEjrD1FbCbZi50iZ1vD94KiToAjqj7xcg7p3BBUXxasHI-A2jdkYU1Eujk5ZCrYsjmDlDENfNNNyt+N7o6x3wX0Xwrw1YH9YCgMbsyDB5I0Hskj1jKAutGDiiWDSj9gX1jhxQJZ8wXxMNG4sg7oCtepbwixdNFi2kOiEiVsHibC6EusetBiSjVD-MtQBEshjoGoMgC9nJkgZdQhaspQVQITyDljJlYSej4TnN5NHCU0nNUIXM3MPNvDGI4FVQQgsFNR6xeD7JVRfDcwFR3A1Qm0STbiz1Vjx44Suhni70Mj6SwEtAcj5wwBxAWShQd0PUg5jotQhU0FGp-Jn1VZcgXczpRTyFxSYTuinQQEGSaTZSkS3jyJik2T950F0EuTDgATLw4Fep6w6wREhMLie4yNNdSS7irC1ipTp5qTZ1ti8tAVnw3U94D53wytcDGdLw0gUFK1zxoCA9H84DriJCoSVjLTIzKTdFAwhdsVWoqlBUOMhta57wpsr8OoHF0F8gzSxlwyJSY1HjYMlDkD3iPV8Dr4RQncIjmz3w8T8xD58xGIQguzoUeyyzJSKz+dB1aS00M0PD3MvDkTkZzx6jggBRqltQj4xtchv0LxlhXo-i8wlz4jSyqDyzrSTFNz7TR0dycjfhp1YyhynTjxkgc8ZcfIFy3clhrg3FZYpFlQ5jHySzySrSY53yqytyx04wcjUAeh8jY8iitiALDyshjgTyIh98zgLzhETohQzzghrhK0qUFigz-F4sbjzSSdbdXyULKyYQBj-zvN3jTsSLbwyLRQKK0zXBTpvBAh64NRaxixYtmKhlWLiyyTWsKS3yeKGB7c-ZeFXp+EshrhSxbxbELheMBQbxNgjMlLjV4D2i1L7jqDIlolYl2Rbl7k08P89co8XiCKBLyIsgkh9LhSL4Tgg5sT5lVVv0RZBSPURZ8wEKHKIyIkokYll43LsKU9kkvL68+LsUzh0DGJ-ZkEpRbgWot5qIqi8wbhRQNkbKg8izzDEL1KnLUrXL5BMq7lU9edP8DdET+KVDkYvFjhojK0d1fJBEGdRErL8x3AJQJV-dD0n9Gq4jmrHLk5nK0rWF3LuqZ8v8DyuFPjpR5ZtNMZ64DhG4qU3EWItRVZwj8g8ylrCyedISkrezpkDrfMiVvZcgdtLt3FllOJFq75lKIdVrliVUshSxVRMFg425+Mht5suUeSKIn0UgEFNhn1aySgSggA */
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
                    onDone: {
                        target: '#Authentication model.Rendering home screen',
                    },
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
                                target: '#Authentication model.Rendering home screen',
                            },
                        },
                    },
                    on: {
                        'Press button to go to sign in screen': {
                            target: '#Authentication model.Rendering signing screen',
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

        context.screen = await renderApp();
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
});

//Signing in tests
// Should we separate jest in case definition into specific files ?
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
                    'Rendering server error': {
                        'Display error': 'Invalid credentials',
                    },
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
        'Displays an error when signing in request failed unexpectedly': {
            target: {
                'Rendering signing screen': {
                    'Filling credentials': 'Filled fields',
                    'Rendering server error': {
                        'Display error': 'Unknown server error',
                    },
                },
            },
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

//Sign up tests
cases<{
    target:
        | 'Rendering signing up screen'
        | 'Rendering home screen'
        | 'Rendering signing screen'
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
        'Signed up successfully': {
            target: 'Rendering home screen',
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
