import { assign, createMachine, EventFrom } from 'xstate';
import { createModel as createTestModel } from '@xstate/test';
import Toast from 'react-native-toast-message';
import cases from 'jest-in-case';
import { rest } from 'msw';
import { ResendConfirmationEmailResponseBody } from '@musicroom/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    render,
    fireEvent,
    waitFor,
    renderAppWithNavigation,
} from '../tests/tests-utils';
import { server } from '../tests/server/test-server';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { withAuthentication } from '../tests/server/handlers';
import { db, generateAuthenticationUser } from '../tests/data';

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const existingUser = generateAuthenticationUser();

/**
 * We had to extract that part of authentication tests from Authentication.test.tsx
 * because it made tests take... 24 minutes to run! Before adding them, they took
 * 3 minutes. This is due to the current behaviour of @xstate/test.
 *
 * See https://github.com/statelyai/xstate/issues/3064
 */
const resendingConfirmationEmailModelMachine = createMachine(
    {
        context: {
            hasReachedRateLimitForConfirmationEmailResending: false,
            isConfirmationEmailResendingGoingToFail: false,
        },
        schema: {
            context: {} as {
                hasReachedRateLimitForConfirmationEmailResending: boolean;
                isConfirmationEmailResendingGoingToFail: boolean;
            },
            events: {} as
                | {
                      type: 'Make resending confirmation email fail';
                  }
                | {
                      type: 'Make rate limit for confirmation email resending exceeded';
                  }
                | {
                      type: 'Press request resending confirmation email button';
                  },
        },
        initial: 'Idle',
        states: {
            Idle: {},
            'Showing success toast': {
                meta: {
                    test: async () => {
                        await waitFor(() => {
                            expect(Toast.show).toHaveBeenLastCalledWith({
                                type: 'success',
                                text1: expect.any(String),
                            });
                        });
                    },
                },
            },
            'Showing rate limit reached toast': {
                meta: {
                    test: async () => {
                        await waitFor(() => {
                            expect(Toast.show).toHaveBeenLastCalledWith({
                                type: 'error',
                                text1: expect.any(String),
                            });
                        });
                    },
                },
            },
            'Showing unknown error occured toast': {
                meta: {
                    test: async () => {
                        await waitFor(() => {
                            expect(Toast.show).toHaveBeenLastCalledWith({
                                type: 'error',
                                text1: expect.any(String),
                            });
                        });
                    },
                },
            },
        },
        on: {
            'Press request resending confirmation email button': [
                {
                    cond: 'Has reached rate limit for confirmation email',
                    target: '.Showing rate limit reached toast',
                },
                {
                    cond: 'Unknown error occured while resending confirmation email',
                    target: '.Showing unknown error occured toast',
                },
                {
                    target: '.Showing success toast',
                },
            ],
            'Make resending confirmation email fail': {
                actions:
                    'Assign resending email confirmation will fail to context',
            },
            'Make rate limit for confirmation email resending exceeded': {
                actions:
                    'Assign rate limit for confirmation email resending exceeded to context',
            },
        },
    },
    {
        guards: {
            'Has reached rate limit for confirmation email': ({
                hasReachedRateLimitForConfirmationEmailResending,
            }) => hasReachedRateLimitForConfirmationEmailResending === true,
            'Unknown error occured while resending confirmation email': ({
                isConfirmationEmailResendingGoingToFail,
            }) => isConfirmationEmailResendingGoingToFail === true,
        },
        actions: {
            'Assign resending email confirmation will fail to context': assign({
                isConfirmationEmailResendingGoingToFail: (_context) => true,
            }),
            'Assign rate limit for confirmation email resending exceeded to context':
                assign({
                    hasReachedRateLimitForConfirmationEmailResending: (
                        _context,
                    ) => true,
                }),
        },
    },
);

const resendingConfirmationEmailModel = createTestModel<TestingContext>(
    resendingConfirmationEmailModelMachine,
).withEvents({
    'Press request resending confirmation email button': async ({ screen }) => {
        const resendingConfirmationEmailButton = await screen.findByText(
            /send.*new.*confirmation.*email/i,
        );
        expect(resendingConfirmationEmailButton).toBeTruthy();

        fireEvent.press(resendingConfirmationEmailButton);
    },

    'Make resending confirmation email fail': () => {
        server.use(
            rest.post(
                `${SERVER_ENDPOINT}/authentication/resend-confirmation-email`,
                withAuthentication((_req, res, ctx) => {
                    return res(ctx.status(500));
                }),
            ),
        );
    },

    'Make rate limit for confirmation email resending exceeded': () => {
        server.use(
            rest.post<never, never, ResendConfirmationEmailResponseBody>(
                `${SERVER_ENDPOINT}/authentication/resend-confirmation-email`,
                withAuthentication((_req, res, ctx) => {
                    return res(
                        ctx.status(429),
                        ctx.json({
                            status: 'REACHED_RATE_LIMIT',
                        }),
                    );
                }),
            ),
        );
    },
});

cases<{
    target:
        | 'Idle'
        | 'Showing success toast'
        | 'Showing rate limit reached toast'
        | 'Showing unknown error occured toast';
    events: EventFrom<typeof resendingConfirmationEmailModelMachine>[];
}>(
    'Resending confirmation email',
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

        const plan = resendingConfirmationEmailModel.getPlanFromEvents(events, {
            target,
        });

        await AsyncStorage.setItem('auth-token', 'token');

        const screen = renderAppWithNavigation();

        await waitFor(() => {
            const emailConfirmationScreenTitle = screen.getByText(
                /confirmation.*email.*address/i,
            );
            expect(emailConfirmationScreenTitle).toBeTruthy();
        });

        await plan.test({
            screen,
        });
    },
    {
        'Displays a success toast when asking for resending confirmation email and rate limit has not been reached':
            {
                target: 'Showing success toast',
                events: [
                    {
                        type: 'Press request resending confirmation email button',
                    },
                ],
            },

        'Displays an error toast when asking for resending confirmation email and rate limit has already been reached':
            {
                target: 'Showing rate limit reached toast',
                events: [
                    {
                        type: 'Make rate limit for confirmation email resending exceeded',
                    },
                    {
                        type: 'Press request resending confirmation email button',
                    },
                ],
            },

        'Displays an error toast when asking for resending confirmation email and server returns an error':
            {
                target: 'Showing unknown error occured toast',
                events: [
                    {
                        type: 'Make resending confirmation email fail',
                    },
                    {
                        type: 'Press request resending confirmation email button',
                    },
                ],
            },
    },
);
