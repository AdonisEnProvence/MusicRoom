import { createMachine, assign } from 'xstate';
import * as z from 'zod';
import { assertEventType } from '../machines/utils';

const authenticationModelMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QEECuAXAFmAduglgMYCGBA9jgAQC2ZEYANgHQCSO+BxD+AXqfhQDEAWWIBrMJVSwwAJ0rEM2PEVKQFOCJVm5684gAcD3EuRyJQBsrA4DzSEAA9EAWgAsARgDMTAGyffAFYPAA43ACY3AAYvcIAaEABPRDdAwL9fEI80rwBOQPDctxCAXxKEtCxcAlM7GjpGVnZObj4zEXFJaTkpHEUqlVN1Yk1tXR7DY1UzCxArGxmHZwQXQK90kK8vVLzfbMCotwTkhA9QkKYAdjSQ69zfXK3Ly7KKpWrputp6ZgAlcdk+BwUEoNig7GBoMIOlwTAAYvgGNxIdDIB8uLB4YjkSCwNRiIjBABlVAAI2oHFB+HBQJBQMoADMyLJqLN5rYKLNluE8kxcpdwuEPDyoh5ch5fOFLsdEB4orlckwIuFfFtAm5xflSuUQJVlDV+BR6j8mP9NHJaVSaZDYKjYQikZbUfQVBisY7IXiCQxBAAVRIGSRGsEQulUL2Ixn4RgQNnWDn2UDLOWpJhpNxeEIhNIqqW5GWnQ6+JiZ3yqhUhKKi16696DQ1Ub6NM16S0htt2nDunGUZ3ohiYh09gzEWCwADuzIgxLJFPQVtDlHpTJZcYWdi5iEiUSYURC-K8UV8Vf5z18BYlhT8cvChyilzcAvuNb1H1qRqbfwBbepi9tMK7IcnR0F0WkHbFLRHMdJ1kad-UDShg1-S16SgicpyjGM1wTTdThvPkikuVU0nlSVpSSWVAiKJhwhCIIsgVRiqJfOsDTMY1m2-G1kJtTtu2AtFXQHQQIAoMAmFgdA1CYV963Yz9TS4kF214gD+JRED+3gBx2UWJNKM2Xc0lCPc3GKVULyFXdbm2S5MwKCVbhYgY2K+Bov3NQFuOtZS+KAjTBLAjoJAXFCqB0ABHVA4HnBlvWwvSnEowJLiuMzciFMs6IKQICyKDwrh5TwUzMtwgmc-VPg-dzFM8n8fKhNSWwtG05AANx6ORZGZGdyUpFSw0ZZlWR0+NEu5Qyolog4QkFTZNgzAsqPSZ47No9Ksk8ModRwBptJQViqsbGq2FsLheAbBKNyWVw9h8MJZu2cICkPQJzwohBs3CPxtnvIjD2eFUKrfBsOI81tIUwMhqEkf8wFwK7ORuhB1lSlLJUlMrMkzMICxcS4LmFHl8sfYozI8YG5Lck1mq85SeN8tT-JBPshPAj1cXxRFWAgBgwERxMksLHxBWK28qKlSV4g+uU1j5W4MvVLx-Ay7U3hco6wdqiH6YauH7QggLQPwN1mcoCNmDYNrzogJgAFEuYYJdYHN6gDHQE5LDG679IQB80e2YV-diLxsgvWXdwx3JRVuAnwkp1zqpppTQtU+HAMNlnNLZ9TOe9Jpre4W2He9Z2lxwQv8FjUb1yR32H3SI8IimqI3tuIJLOFGjxSPS4Mr3Z41drDX32O5O6u8v8-Mz3ts7A3PXfzq2bYF3CBQKpvb3FzIiNymWYm++8PDubMHyKBPNYU2n6qnpmZ9Z+ezYtpgADUV5rnDkYJ1KytCTx7yyF4S4HgLzbGLFKOiqoUwPEiBfUeWtr6Tw7HfDms9AomwHAvC2q8v6KlFmccWGUiKCjyo+aypFHyRCyNmOBoMr4pwGo1dOC8H4YPZsOUc6FYI8z5jg32EcCa5FuIUTI9w6LkROPsYsMQ8iD2KFWIeslE5j04hPXWt9mFm1YabGeaEYK22XkXJgAAFTh+iy54ndp7OY3s65C2uD4Qi39RQeA1K3C8lx5RXGPmEHxEoBS+FofJGqiD1HIM0ffOebCF56KnAXd+Xta6C2WE+Pkj5nFnDcXvSRqpiwCk8VjYoCoBRBOpqonWqdGYRNQdozBZtYncLfkXPhQtKwFQlJKKsx9gHKyODLLMioBQpQzI8YIs03ClKTuUlqYS04GxqVEnRqCGnV0SZ-X2WQrj7mEWIsRvgJGykfBvDMhxrjdPjjqJRl8QkMIZkw+ZPZan7RsUk3CaQaKRAIa3IhUsCy3DcLuaOvcgGRCol4SZKjwYzMqfcrsoTQTtU6rIbqsgeH8w-uNRAfc+SClFGRfkaxaIFkfIqPI-Ijz7iEceMqEKEG3L1nxeFMhZAdXkF1ZkTAAAi+BYDGGIIkc2yLmQtOWPuHcojQ5mVFsA7JWLj5MFPkKYRj4m60voWomF+s4UMMRWyoVsgRWIHeRlW8l4+4OKJR9PIALohZgiIHTMEzLmHXgeqipjCtWGpRgVfBwpvmS0FF4AssQCqeD7uqMswCszgudSPOh7kvUuFVKlB6RVnoijenjbI7TvDPWIWRVxMayhAA */
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
                'Rendering home screen': {},
                'Rendering signing screen': {
                    type: 'parallel',
                    states: {
                        'Filling credentials': {
                            type: 'parallel',
                            states: {
                                'Filling email': {
                                    initial: 'Idle',
                                    states: {
                                        Idle: {},
                                        Invalid: {
                                            initial: 'Email is empty',
                                            states: {
                                                'Email is empty': {},
                                                'Email is invalid': {},
                                            },
                                        },
                                        Valid: {
                                            type: 'final',
                                        },
                                    },
                                    on: {
                                        'Submit signing in form': [
                                            {
                                                cond: 'Signing in email is empty',
                                                target: '#Authentication model.Rendering signing screen.Filling credentials.Filling email.Invalid.Email is empty',
                                            },
                                            {
                                                cond: 'Signing in email is invalid',
                                                target: '#Authentication model.Rendering signing screen.Filling credentials.Filling email.Invalid.Email is invalid',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing screen.Filling credentials.Filling email.Valid',
                                            },
                                        ],
                                        'Type on signing in email field': {
                                            actions:
                                                'Assign signing in typed email to context',
                                            target: '#Authentication model.Rendering signing screen.Filling credentials.Filling email',
                                        },
                                    },
                                },
                                'Filling password': {
                                    initial: 'Idle',
                                    states: {
                                        Idle: {},
                                        Invalid: {
                                            initial: 'Password is empty',
                                            states: {
                                                'Password is empty': {},
                                            },
                                        },
                                        Valid: {
                                            type: 'final',
                                        },
                                    },
                                    on: {
                                        'Submit signing in form': [
                                            {
                                                cond: 'Signing in password is empty',
                                                target: '#Authentication model.Rendering signing screen.Filling credentials.Filling password.Invalid.Password is empty',
                                            },
                                            {
                                                target: '#Authentication model.Rendering signing screen.Filling credentials.Filling password.Valid',
                                            },
                                        ],
                                        'Type on signing in password field': {
                                            actions:
                                                'Assign signing in typed password to context',
                                            target: '#Authentication model.Rendering signing screen.Filling credentials.Filling password',
                                        },
                                    },
                                },
                            },
                            on: {
                                'Make signing in request fail': {
                                    actions:
                                        'Assign signing in request will fail to context',
                                    target: '#Authentication model.Rendering signing screen.Filling credentials',
                                },
                            },
                            onDone: {
                                target: '#Authentication model.Rendering home screen',
                            },
                        },
                        'Rendering server error': {
                            initial: 'Idle',
                            states: {
                                Idle: {},
                                'Display error': {},
                            },
                            on: {
                                'Submit signing in form': [
                                    {
                                        cond: 'Server returns an error for signing in request',
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Display error',
                                    },
                                    {
                                        target: '#Authentication model.Rendering signing screen.Rendering server error.Idle',
                                    },
                                ],
                            },
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
