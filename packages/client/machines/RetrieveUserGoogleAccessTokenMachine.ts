import { AuthSessionResult } from 'expo-auth-session';
import invariant from 'tiny-invariant';
import { ContextFrom, EventFrom, sendParent, StateMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import Toast from 'react-native-toast-message';
import { assertEventType } from './utils';

const retrieveUserGoogleAccessTokenModel = createModel(
    {
        userGoogleAccessToken: undefined as string | undefined,
    },
    {
        events: {
            RECEIVED_GOOGLE_OAUTH_RESPONSE: (args: {
                googleResponse: AuthSessionResult;
            }) => args,
            __RETRIEVED_USER_GOOGLE_ACCESS_TOKEN_SUCCESSFULLY: (
                userGoogleAccessToken: string,
            ) => ({ userGoogleAccessToken }),
            __FAILED_TO_RETRIEVE_USER_GOOGLE_ACCESS_TOKEN: () => ({}),
        },

        actions: {
            sendOperationFailureToParent: () => ({}),
            displayGoogleAuthenticationDismissErrorToast: () => ({}),
            displayGoogleAuthenticationCancelErrorToast: () => ({}),
            displayGoogleAuthenticationLockedErrorToast: () => ({}),
            displayGoogleAuthenticationResponseErrorToast: () => ({}),
            sendOperationSuccessToParent: () => ({}),
        },
    },
);

export const createRetrieveUserGoogleAccessTokenMachine = (): StateMachine<
    ContextFrom<typeof retrieveUserGoogleAccessTokenModel>,
    any,
    EventFrom<typeof retrieveUserGoogleAccessTokenModel>
> => {
    return retrieveUserGoogleAccessTokenModel.createMachine(
        {
            preserveActionOrder: true,
            context: {
                userGoogleAccessToken: undefined,
            },

            on: {
                RECEIVED_GOOGLE_OAUTH_RESPONSE: [
                    {
                        cond: 'googleAuthenticationIsSuccessful',
                        actions: 'sendOperationSuccessToParent',
                    },
                    {
                        cond: 'googleAuthenticationDismissError',

                        actions: [
                            'displayGoogleAuthenticationDismissErrorToast',
                            'sendOperationFailureToParent',
                        ],
                    },
                    {
                        cond: 'googleAuthenticationCancelError',

                        actions: [
                            'displayGoogleAuthenticationCancelErrorToast',
                            'sendOperationFailureToParent',
                        ],
                    },
                    {
                        cond: 'googleAuthenticationLockedError',

                        actions: [
                            'displayGoogleAuthenticationLockedErrorToast',
                            'sendOperationFailureToParent',
                        ],
                    },
                    {
                        actions: [
                            'displayGoogleAuthenticationResponseErrorToast',
                            'sendOperationFailureToParent',
                        ],
                    },
                ],
            },
        },
        {
            actions: {
                sendOperationSuccessToParent: sendParent((_context, event) => {
                    assertEventType(event, 'RECEIVED_GOOGLE_OAUTH_RESPONSE');

                    const { googleResponse } = event;
                    invariant(
                        googleResponse.type === 'success',
                        'to retrieve user google access token response should be at status success',
                    );
                    invariant(
                        googleResponse.authentication !== null,
                        'Inside a google success oauth response authentication should always be defined',
                    );

                    return retrieveUserGoogleAccessTokenModel.events.__RETRIEVED_USER_GOOGLE_ACCESS_TOKEN_SUCCESSFULLY(
                        googleResponse.authentication.accessToken,
                    );
                }),

                sendOperationFailureToParent: sendParent(
                    retrieveUserGoogleAccessTokenModel.events.__FAILED_TO_RETRIEVE_USER_GOOGLE_ACCESS_TOKEN(),
                ),

                displayGoogleAuthenticationDismissErrorToast: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Continue with google error',
                        text2: 'Oauth verification was dismissed',
                    });
                },

                displayGoogleAuthenticationCancelErrorToast: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Continue with google error',
                        text2: 'Oauth verification was cancelled',
                    });
                },

                displayGoogleAuthenticationLockedErrorToast: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Continue with google error',
                        text2: 'Given account is locked',
                    });
                },
                displayGoogleAuthenticationResponseErrorToast: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Continue with google error',
                        text2: 'Google sent back an error please try again later',
                    });
                },
            },

            guards: {
                googleAuthenticationDismissError: (_context, event) => {
                    assertEventType(event, 'RECEIVED_GOOGLE_OAUTH_RESPONSE');
                    return event.googleResponse.type === 'dismiss';
                },
                googleAuthenticationCancelError: (_context, event) => {
                    assertEventType(event, 'RECEIVED_GOOGLE_OAUTH_RESPONSE');
                    return event.googleResponse.type === 'cancel';
                },
                googleAuthenticationLockedError: (_context, event) => {
                    assertEventType(event, 'RECEIVED_GOOGLE_OAUTH_RESPONSE');
                    return event.googleResponse.type === 'locked';
                },
                googleAuthenticationIsSuccessful: (_context, event) => {
                    assertEventType(event, 'RECEIVED_GOOGLE_OAUTH_RESPONSE');
                    return event.googleResponse.type === 'success';
                },
            },
        },
    );
};
