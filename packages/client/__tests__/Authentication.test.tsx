import { createModel } from '@xstate/test';
import cases from 'jest-in-case';
import invariant from 'tiny-invariant';
import { createMachine, assign, EventFrom } from 'xstate';
import * as z from 'zod';
import { assertEventType } from '../machines/utils';
import {
    render,
    renderAuthenticatedApp,
    renderUnauthenticatedApp,
    waitFor,
    within,
    fireEvent,
} from '../tests/tests-utils';

interface TestingContext {
    screen?: ReturnType<typeof render>;
}

const user = {
    email: 'baptou@gmail.fr',
    password: 'azerty',
};

const authenticationModelMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QEECuAXAFmAduglgMYCGBA9jgAQC2ZEYANgHQCSO+BxD+AXqfhQDEAWWIBrMJVSwwAJ0rEM2PEVKQFOCJVm5684gAcD3EuRyJQBsrA4DzSEAA9EAZgCsATiYBGAOy+XADYAJhcAFmCwgAZAqN8AGhAAT0QAWl8fDw8ADm9ctzdfDxCPMIBfMsS0LFwCUzsaOkZWdk5uPjMRcUlpOSkcRRqVU3ViTW1dPsNjVTMLECsbOYdnBFTvYK9stxcPfzco7Oywo8DElIRgtzCmaPCXbJcnk+Ds4IqqpVrZhtp6ZgASpNZPgcFBKDYoOwwRDCDpcEwAGL4BjcGFwyDfLiwJEotHggBm+EYEBxyNRoPBYGoxBRggAyqgAEbUDgQ-BQymUUGUAlkWTUeaLWwUearDYZQJhaI7QJZQJPQIJZKIbwKyVhNzZXxRHZhKW+cqVEDVZR1fgURr-JhAzRyLmQ6Hg2AYhHk-GUDH0FTY3EUmFEklkvFc6m0hiCAAqSQMkktjq5PLDKN5xIYECF1hF9lAq2CCtu2TlxyLeVKURc51VHjcwSYO0icsi3iiGyNnyG5rMVuatr0Do5Tth8Jwfo9XqxDGD-sJadJY65BmIsFgAHd+RAGczWeh2ZyYTy+QLM0s7GLVcE663ihtgq2XN5a5WVZdXoEmKVpVE74FPC53saprfPUlp-L2wIDvuzquqO7pchOPpTguAZztOHpLiu66yJu0axpQ8aDomVAYWuG6piSJ7ZuelxSkw37ftkpRuLESq+GcL5XOEPhRKU3gttsORKh8JpfMMFpUGBgIQTCCYyTByHgghbRoVygbprAggQBQYBMLA6BqEwQFid2kk2tJzqEXJI4KZ6OjespNlqaSlHLLmiBvFETChL4eTfpeBzBMqFzeB4FZMLsBQ8WEGy5GqwlGV2vxNFJdogjJlnQdZcHonZk4qShQZdBIe5DjyOgAI6oHAu4EuGLlnisiBsTckRsaFYQ6p+7HBZenkeH4mr+NquqtvFomJaByVmalkFDi61l9vaMlyAAbn0ciyPyW4smysngoe-KCg4wquU4rith+WShaEWrbC2bhVgghTeB+ngHN40RvL4bhjZ2PyTdai1pRZUHDmAuCadpun6egOkJf9ElTUDs0OjB9Wio1CDXeFupHJ4RyGg9HG6kwgSPlKjHPJENYVMaOBNPADjwyBiPWmwthcLw4nozmZ0INFTBsUcmxsW4fhXGEj1eIc2QMWELitgaBS-WaCM9il-YwpgZDUJI83g7zJ0NW5CAthsTC5McgRyrEl7uI9qS-oLsVxJspQ1gqKvAeJ6vTZrINzfJ2WKbliH5bOQY2cmzAsBADBgDz1GhC4XkVpE+ZShLaqPeT2Sk5FPG9b+H1e8ZSWA+ZJWo1lIY5ZiYeOahUc0iiLQrZzEBMAAoi3DDcrAlDUgY6AXJYWanasYQ5HRrZxJ10S6jWOeGtLHguAEHihIc-4AR2qss77yPpaD+turXIf1w5wfkepzfhm3Hfd73-fcjg7fcBmx3j8bfNT243H+HcNFIs1tJYvjVLLbirx-D9UCI8EIpcJqs3AjNY+gca4zlspffAvpr5OXDoPXuD8P6J0xh1F6LZAHXDyNbKUOdYgZD4neB8+Y4gtkCIgtWpkj4B2rgbGySkcFITwU3a+0cmAADUO6kJNqEF6+YghvH-B9GIOcp5eFAR9IoMRfwcMAuNLhSNK57TBmfTBgjcHnxvvOMRvcZF8xbCnKUMogjykVEFVU0UbhKieK2K4uoFbthEn9A+3DjEZVMbBKxFjhFWPwTZEiWFO6x3jvYvMwQXqMQ2GqAI+pvpvEepePwr0gFxDFmvPRe9vYmSMag3hVl+HXxiQQ+J19EkbmIfgTuAAFZcpFsIvyHiPNJiATgvSiK2fUPiHxKm6ogUItEdhaM8GWMmQTmY+zCXUquDSzHjlDlfOJoirHtOwp0z+Y9TwYxNoNGeH1rYBBmWxQpmwXrXBGrsBWZNDScNCbU-2OzMqNOiQcoRLTjmYNOZ3KRJCv5XN5nmEKr01TMV2HkQKSpCkfTzsUfMRR5b4u8L8zZ-ylr1KBXs+CoLLGYNaScvpSSRlYzzteMmvVvAPifIUmIKc9h+DiNKGsexiU1Irtskxp8onmOpbE2lqEmWGjoiFNld4OWPlCDncIL04GRGuJ4L8JwRXlxQQCiVQcQXYJpfHLQ+CmWbzzoTY4+p2pTzAcFWWecHz9SAVKBUOwjUAxNWSwFkSBEysZpcqimMDhKpvOyzll45mmy0R+DOfEOWF31AG5BGtg1moWsY1a61ZCbVkKwOOCc4VRpNt9esGTor7EcWTR6zFPLhH1NKIWkQizZsPuEk+8keEQiLfIDa-ImAABF8CwGMMQJIg8S38jtXxW4MRDieGttcXw2RHpwM8hk-IDxGKb3zL2rZpqImSr9nmkdC7S1MEZDtdAsMtCwFQIQQgcBYAElQKiUeCxv7XL5kK8KWQihZEfIAnd4D6L1i+WqXUtYGFntJcDENV6h0yFkGtUdi7ZBMrFnWj6fhvpNu8I9Dq-93Dr1yK8UoZNlb6JCSSsVF6B0jiZfmWNKr7zqvzBR784USh+FyDEQmlTgn7xY4wJl6wdgWx2Hsb6MsThFgdhyh1PkcjSmAUEH6tMgA */
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
                                                                            expect(
                                                                                within(
                                                                                    screen.getByTestId(
                                                                                        'signing-in-screen-email-field',
                                                                                    ),
                                                                                ).getByText(
                                                                                    /field.*required/i,
                                                                                ),
                                                                            ).toBeTruthy();
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
                                                                            expect(
                                                                                within(
                                                                                    screen.getByTestId(
                                                                                        'signing-in-screen-email-field',
                                                                                    ),
                                                                                ).getByText(
                                                                                    /not.*well.*formed.*email.*address/i,
                                                                                ),
                                                                            ).toBeTruthy();
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
                                                                            expect(
                                                                                within(
                                                                                    screen.getByTestId(
                                                                                        'signing-in-screen-password-field',
                                                                                    ),
                                                                                ).getByText(
                                                                                    /field.*required/i,
                                                                                ),
                                                                            ).toBeTruthy();
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
                                Idle: {},
                                'Display error': {},
                                'Submitted successfully': {
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
                    const isUnknownUser = user.email !== signingInEmail;
                    if (isUnknownUser === true) {
                        return true;
                    }

                    const isInvalidPassword =
                        user.password !== signingInPassword;
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
        localStorage.setItem('token', 'token');

        context.screen = await renderAuthenticatedApp();
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
                    password: 'azerty',
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
                    email: 'baptou@gmail.fr',
                },
                {
                    type: 'Type on signing in password field',
                    password: 'azerty',
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
