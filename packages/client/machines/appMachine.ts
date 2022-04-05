import {
    AuthenticateWithGoogleOauthFailureReponseBody,
    ConfirmEmailResponseBody,
    GetMyProfileInformationResponseBody,
    RequestPasswordResetResponseBody,
    ResendConfirmationEmailResponseBody,
    SignInResponseBody,
    SignOutResponseBody,
    ValidatePasswordResetTokenResponseBody,
} from '@musicroom/types';
import invariant from 'tiny-invariant';
import Toast from 'react-native-toast-message';
import {
    assign,
    ContextFrom,
    createMachine,
    DoneInvokeEvent,
    EventFrom,
    forwardTo,
    Interpreter,
    Receiver,
    send,
    Sender,
    StateMachine,
} from 'xstate';
import { raise } from 'xstate/lib/actions';
import { IS_TEST } from '../constants/Env';
import { SocketClient } from '../contexts/SocketContext';
import {
    sendAuthenticateWithGoogleAccount,
    sendEmailConfirmationCode,
    sendRequestingPasswordReset,
    sendResendingConfirmationEmail,
    sendSignIn,
    sendSignOut,
    sendValidatePasswordResetCode,
} from '../services/AuthenticationService';
import { request, SHOULD_USE_TOKEN_AUTH } from '../services/http';
import { getMyProfileInformation } from '../services/UsersSearchService';
import { navigateFromRef } from '../navigation/RootNavigation';
import { appModel, resetUserGoogleAccessToken } from './appModel';
import { createAppMusicPlayerMachine } from './appMusicPlayerMachine';
import { createAppMusicPlaylistsMachine } from './appMusicPlaylistsMachine';
import { createUserMachine } from './appUserMachine';
import { AppMusicPlayerMachineOptions } from './options/appMusicPlayerMachineOptions';
import { AppMusicPlaylistsOptions } from './options/appMusicPlaylistsMachineOptions';
import { AppUserMachineOptions } from './options/appUserMachineOptions';
import { assertEventType, PLATFORM_OS_IS_WEB } from './utils';

interface CreateAppMachineArgs {
    locationPollingTickDelay: number;
    socket: SocketClient;
    musicRoomBroadcastChannel?: BroadcastChannel;
    musicPlayerMachineOptions: AppMusicPlayerMachineOptions;
    userMachineOptions: AppUserMachineOptions;
    appMusicPlaylistsMachineOptions: AppMusicPlaylistsOptions;
}

export type AppMachineInterpreter = Interpreter<
    ContextFrom<typeof appModel>,
    any,
    EventFrom<typeof appModel>
>;

export function createAppMachine({
    socket,
    musicRoomBroadcastChannel,
    locationPollingTickDelay,
    musicPlayerMachineOptions,
    userMachineOptions,
    appMusicPlaylistsMachineOptions,
}: CreateAppMachineArgs): StateMachine<
    ContextFrom<typeof appModel>,
    any,
    EventFrom<typeof appModel>
> {
    return appModel.createMachine(
        {
            id: 'app',

            invoke: {
                id: 'broadcastChannelService',
                src:
                    () =>
                    (
                        sendBack: Sender<EventFrom<typeof appModel>>,
                        onReceive: Receiver<EventFrom<typeof appModel>>,
                    ) => {
                        if (PLATFORM_OS_IS_WEB) {
                            invariant(
                                musicRoomBroadcastChannel !== undefined,
                                'broadcast channel is undefined on web OS',
                            );

                            musicRoomBroadcastChannel.onmessage = (event) => {
                                switch (event.data) {
                                    case 'RELOAD_BROWSER_TABS': {
                                        sendBack('__RECEIVED_RELOAD_PAGE');
                                        break;
                                    }
                                    default: {
                                        console.error(
                                            'encountered unknown broadcast channel message',
                                        );
                                    }
                                }
                            };

                            onReceive((event) => {
                                switch (event.type) {
                                    case '__BROADCAST_RELOAD_INTO_BROADCAST_CHANNEL': {
                                        musicRoomBroadcastChannel.postMessage(
                                            'RELOAD_BROWSER_TABS',
                                        );

                                        break;
                                    }
                                }
                            });
                        }
                    },
            },

            initial: 'loadingAuthenticationTokenFromAsyncStorage',

            states: {
                loadingAuthenticationTokenFromAsyncStorage: {
                    tags: 'showApplicationLoader',

                    always: {
                        cond: 'shouldUseWebAuth',

                        target: 'fetchingInitialUserAuthenticationState',
                    },

                    invoke: {
                        src: 'loadAuthenticationTokenFromAsyncStorage',

                        onDone: {
                            target: 'fetchingInitialUserAuthenticationState',
                        },
                    },
                },

                fetchingInitialUserAuthenticationState: {
                    tags: 'showApplicationLoader',

                    invoke: {
                        src: 'fetchUser',

                        onDone: {
                            actions: assign({
                                myProfileInformation: (_context, e) => {
                                    const event =
                                        e as DoneInvokeEvent<GetMyProfileInformationResponseBody>;

                                    return event.data;
                                },
                            }),
                            target: 'checkingUserAccountValidity',
                        },

                        onError: {
                            target: 'waitingForUserAuthentication',
                        },
                    },
                },

                waitingForUserAuthentication: {
                    tags: 'userIsUnauthenticated',

                    type: 'parallel',

                    states: {
                        signingIn: {
                            initial: 'waitingForCredentials',

                            states: {
                                waitingForCredentials: {},

                                submitingCredentials: {
                                    invoke: {
                                        src: 'signIn',

                                        onDone: [
                                            {
                                                cond: 'submittedSigningInCredentialsAreInvalid',

                                                target: 'credentialsAreInvalid',
                                            },
                                            {
                                                target: 'successfullySubmittedCredentials',
                                            },
                                        ],

                                        onError: {
                                            target: 'unknownErrorOccuredDuringSubmitting',
                                        },
                                    },
                                },

                                successfullySubmittedCredentials: {
                                    type: 'final',
                                },

                                credentialsAreInvalid: {
                                    tags: 'signingInCredentialsAreInvalid',
                                },

                                unknownErrorOccuredDuringSubmitting: {
                                    tags: 'unknownErrorOccuredDuringSubmittingSigningInForm',
                                },
                            },

                            on: {
                                SIGN_IN: {
                                    target: 'signingIn.submitingCredentials',

                                    actions: appModel.assign({
                                        email: (_, event) => event.email,
                                        password: (_, event) => event.password,
                                    }),
                                },
                            },

                            onDone: {
                                actions: raise({
                                    type: '__AUTHENTICATED',
                                }),
                            },
                        },

                        passwordResetting: {
                            initial: 'waitingForEmail',

                            states: {
                                waitingForEmail: {
                                    on: {
                                        REQUEST_PASSWORD_RESET: {
                                            target: 'requestingPasswordReset',

                                            actions: appModel.assign({
                                                email: (_, event) =>
                                                    event.email,
                                            }),
                                        },
                                    },
                                },

                                requestingPasswordReset: {
                                    initial: 'sendingRequest',

                                    states: {
                                        sendingRequest: {
                                            invoke: {
                                                src: 'requestPasswordReset',

                                                onDone: [
                                                    {
                                                        cond: 'hasReachedRateLimitForPasswordResetRequests',

                                                        target: 'reachedRateLimitForPasswordResetRequests',

                                                        actions:
                                                            'showToastForRateLimitedPasswordResetRequests',
                                                    },
                                                    {
                                                        cond: 'isProvidedEmailInvalid',

                                                        target: 'providedEmailIsInvalid',

                                                        actions:
                                                            'showToastForFailedPasswordResetAsEmailIsInvalid',
                                                    },
                                                    {
                                                        target: 'requestedPasswordResetSuccessfully',

                                                        actions: [
                                                            'showToastForSuccessfulPasswordReset',
                                                            'redirectToPasswordResetTokenScreen',
                                                        ],
                                                    },
                                                ],

                                                onError: {
                                                    target: 'erredRequestingPasswordReset',

                                                    actions:
                                                        'showToastForFailedPasswordReset',
                                                },
                                            },

                                            on: {
                                                REQUEST_PASSWORD_RESET:
                                                    undefined,
                                            },
                                        },

                                        providedEmailIsInvalid: {},

                                        reachedRateLimitForPasswordResetRequests:
                                            {},

                                        erredRequestingPasswordReset: {},

                                        requestedPasswordResetSuccessfully: {
                                            type: 'final',
                                        },
                                    },

                                    on: {
                                        REQUEST_PASSWORD_RESET: {
                                            target: 'requestingPasswordReset.sendingRequest',

                                            actions: appModel.assign({
                                                email: (_, event) =>
                                                    event.email,
                                            }),
                                        },
                                    },

                                    onDone: {
                                        target: 'validatingCode',
                                    },
                                },

                                validatingCode: {
                                    initial: 'waitingForCode',

                                    states: {
                                        waitingForCode: {
                                            on: {
                                                SUBMIT_PASSWORD_RESET_CONFIRMATION_CODE_FORM:
                                                    {
                                                        target: 'sendingValidationRequest',

                                                        actions:
                                                            appModel.assign({
                                                                passwordResetCode:
                                                                    (
                                                                        _,
                                                                        event,
                                                                    ) =>
                                                                        event.code,
                                                            }),
                                                    },
                                            },
                                        },

                                        sendingValidationRequest: {
                                            invoke: {
                                                src: 'validatePasswordResetCode',

                                                onDone: [
                                                    {
                                                        cond: 'isPasswordResetCodeInvalid',

                                                        target: 'codeIsInvalid',
                                                    },
                                                    {
                                                        target: 'codeIsValid',

                                                        actions:
                                                            'showToastForValidPasswordResetCode',
                                                    },
                                                ],

                                                onError: {
                                                    target: 'unknownErrorOccuredDuringValidation',

                                                    actions:
                                                        'showToastForUnknownErrorDuringPasswordResetCodeValidation',
                                                },
                                            },

                                            on: {
                                                SUBMIT_PASSWORD_RESET_CONFIRMATION_CODE_FORM:
                                                    undefined,
                                            },
                                        },

                                        codeIsValid: {
                                            type: 'final',
                                        },

                                        codeIsInvalid: {
                                            tags: 'passwordResetCodeIsInvalid',
                                        },

                                        unknownErrorOccuredDuringValidation: {},
                                    },

                                    on: {
                                        SUBMIT_PASSWORD_RESET_CONFIRMATION_CODE_FORM:
                                            {
                                                target: 'validatingCode.sendingValidationRequest',

                                                actions: appModel.assign({
                                                    passwordResetCode: (
                                                        _,
                                                        event,
                                                    ) => event.code,
                                                }),
                                            },
                                    },
                                },
                            },
                        },

                        signingUp: {
                            initial: 'waitingForSignUpFormSubmitSuccess',
                            states: {
                                waitingForSignUpFormSubmitSuccess: {
                                    on: {
                                        SIGNED_UP_SUCCESSFULLY: {
                                            target: 'successfullySubmittedSignUpCredentials',
                                        },
                                    },
                                },

                                successfullySubmittedSignUpCredentials: {
                                    type: 'final',
                                },
                            },

                            onDone: {
                                actions: raise({
                                    type: '__AUTHENTICATED',
                                }),
                            },
                        },

                        //here
                        googleAuthenticationHandler: {
                            initial: 'waitingForGoogleUserAccessToken',
                            states: {
                                waitingForGoogleUserAccessToken: {
                                    initial: 'Idle',
                                    states: {
                                        Idle: {
                                            /**
                                             * We're reseting this context prop in case the user encounters an error during the google
                                             * authentication process and has to restart everything from there
                                             */
                                            entry: resetUserGoogleAccessToken,
                                        },

                                        googleAuthenticationErrorOccured: {},
                                    },

                                    on: {
                                        RECEIVED_GOOGLE_OAUTH_RESPONSE: [
                                            {
                                                cond: 'googleAuthenticationIsSuccessful',
                                                actions: appModel.assign({
                                                    userGoogleAccessToken: (
                                                        _context,
                                                        { googleResponse },
                                                    ) => {
                                                        invariant(
                                                            googleResponse.type ===
                                                                'success',
                                                            'to retrieve user google access token response should be at status success',
                                                        );
                                                        invariant(
                                                            googleResponse.authentication !==
                                                                null,
                                                            'Inside a google success oauth response authentication should always be defined',
                                                        );

                                                        return googleResponse
                                                            .authentication
                                                            .accessToken;
                                                    },
                                                }),
                                                target: 'sendingGoogleAccessTokenToServer',
                                            },
                                            {
                                                cond: 'googleAuthenticationDismissError',

                                                actions:
                                                    'displayGoogleAuthenticationDismissErrorToast',

                                                target: '.googleAuthenticationErrorOccured',
                                            },
                                            {
                                                cond: 'googleAuthenticationCancelError',

                                                actions:
                                                    'displayGoogleAuthenticationCancelErrorToast',

                                                target: '.googleAuthenticationErrorOccured',
                                            },
                                            {
                                                cond: 'googleAuthenticationLockedError',

                                                actions:
                                                    'displayGoogleAuthenticationLockedErrorToast',

                                                target: '.googleAuthenticationErrorOccured',
                                            },
                                            {
                                                actions:
                                                    'displayGoogleAuthenticationResponseErrorToast',

                                                target: '.googleAuthenticationErrorOccured',
                                            },
                                        ],
                                    },
                                },

                                sendingGoogleAccessTokenToServer: {
                                    initial: 'Idle',
                                    states: {
                                        Idle: {
                                            invoke: {
                                                src: 'sendGoogleUserAccessTokenToServer',

                                                onDone: {
                                                    target: 'userIsAuthenticatedViaGoogleOauth',
                                                    actions:
                                                        'googleAuthenticationDisplayServerOperationSuccess',
                                                },

                                                onError: [
                                                    {
                                                        cond: 'googleAuthenticationServerEmailNorNicknameInvalidError',

                                                        actions:
                                                            'googleAuthenticationDisplayServerEmailNorNicknameInvalidToastError',

                                                        target: '#app.waitingForUserAuthentication.googleAuthenticationHandler.waitingForGoogleUserAccessToken.Idle',
                                                    },
                                                    {
                                                        cond: 'googleAuthenticationServerEmailNorNicknameUnavailableError',

                                                        actions:
                                                            'googleAuthenticationServerEmailNorNicknameUnavailableToastError',

                                                        target: '#app.waitingForUserAuthentication.googleAuthenticationHandler.waitingForGoogleUserAccessToken.Idle',
                                                    },
                                                    {
                                                        actions:
                                                            'googleAuthenticationDisplayServerUnknownError',

                                                        target: '#app.waitingForUserAuthentication.googleAuthenticationHandler.waitingForGoogleUserAccessToken.Idle',
                                                    },
                                                ],
                                            },
                                        },

                                        userIsAuthenticatedViaGoogleOauth: {
                                            entry: resetUserGoogleAccessToken,
                                            type: 'final',
                                        },
                                    },
                                },
                            },

                            onDone: {
                                actions: raise({
                                    type: '__AUTHENTICATED',
                                }),
                            },
                        },
                    },

                    on: {
                        __AUTHENTICATED: {
                            target: 'refetchingUserAuthenticationState',

                            actions: 'sendBroadcastReloadIntoBroadcastChannel',
                        },
                    },
                },

                refetchingUserAuthenticationState: {
                    tags: 'userIsUnauthenticated',

                    invoke: {
                        src: 'fetchUser',

                        onDone: {
                            actions: assign({
                                myProfileInformation: (_context, e) => {
                                    const event =
                                        e as DoneInvokeEvent<GetMyProfileInformationResponseBody>;

                                    return event.data;
                                },
                            }),
                            target: 'checkingUserAccountValidity',
                        },

                        onError: {
                            target: 'waitingForUserAuthentication',
                        },
                    },
                },

                checkingUserAccountValidity: {
                    tags: 'showApplicationLoader',

                    always: [
                        {
                            cond: 'userEmailIsNotConfirmed',

                            target: 'waitingForUserEmailConfirmation',
                        },
                        {
                            target: 'reconnectingSocketConnection',
                        },
                    ],
                },

                waitingForUserEmailConfirmation: {
                    tags: 'userEmailIsNotConfirmed',
                    type: 'parallel',

                    states: {
                        formHandler: {
                            initial: 'waitingForCodeToBeSubmitted',

                            states: {
                                waitingForCodeToBeSubmitted: {
                                    initial: 'idle',

                                    states: {
                                        idle: {},

                                        previousCodeWasInvalid: {
                                            tags: 'previousEmailConfirmationCodeWasInvalid',
                                        },

                                        unknownErrorOccuredDuringPreviousSubmitting:
                                            {
                                                tags: 'unknownErrorOccuredDuringPreviousSubmittingOfEmailConfirmationCode',
                                            },
                                    },

                                    on: {
                                        SUBMIT_EMAIL_CONFIRMATION_FORM: {
                                            target: 'sendingConfirmationCode',

                                            actions: appModel.assign({
                                                confirmationCode: (
                                                    _context,
                                                    { code },
                                                ) => code,
                                            }),
                                        },
                                    },
                                },

                                sendingConfirmationCode: {
                                    invoke: {
                                        src: 'sendConfirmationCode',

                                        onDone: [
                                            {
                                                cond: 'isConfirmationCodeInvalid',

                                                target: 'waitingForCodeToBeSubmitted.previousCodeWasInvalid',
                                            },
                                            {
                                                target: 'revalidatingUserInformation',
                                            },
                                        ],

                                        onError: {
                                            target: 'waitingForCodeToBeSubmitted.unknownErrorOccuredDuringPreviousSubmitting',
                                        },
                                    },
                                },

                                revalidatingUserInformation: {
                                    invoke: {
                                        src: 'fetchUser',

                                        onDone: {
                                            target: 'revalidatedUserInformation',

                                            actions: assign({
                                                myProfileInformation: (
                                                    _context,
                                                    e,
                                                ) => {
                                                    const event =
                                                        e as DoneInvokeEvent<GetMyProfileInformationResponseBody>;

                                                    return event.data;
                                                },
                                            }),
                                        },

                                        onError: {
                                            target: 'failedToRevalidateUserInformation',
                                        },
                                    },
                                },

                                revalidatedUserInformation: {
                                    type: 'final',
                                },

                                failedToRevalidateUserInformation: {},
                            },

                            onDone: {
                                target: '#app.reconnectingSocketConnection',
                            },
                        },

                        pollingHandler: {
                            initial: 'pollingMyProfileInformation',

                            states: {
                                pollingMyProfileInformation: {
                                    invoke: {
                                        src: 'fetchUser',

                                        onDone: [
                                            {
                                                cond: (_context, e) => {
                                                    const event =
                                                        e as DoneInvokeEvent<GetMyProfileInformationResponseBody>;
                                                    return (
                                                        event.data
                                                            .hasConfirmedEmail ===
                                                        true
                                                    );
                                                },
                                                actions: assign({
                                                    myProfileInformation: (
                                                        _context,
                                                        e,
                                                    ) => {
                                                        const event =
                                                            e as DoneInvokeEvent<GetMyProfileInformationResponseBody>;

                                                        return event.data;
                                                    },
                                                }),
                                                target: 'userEmailIsVerified',
                                            },
                                            {
                                                target: 'debouncing',
                                            },
                                        ],

                                        onError: {
                                            target: 'debouncing',
                                        },
                                    },
                                },

                                debouncing: {
                                    after: {
                                        POLLING_EMAIL_VERIFICATION_STATUS_DELAY:
                                            {
                                                target: 'pollingMyProfileInformation',
                                            },
                                    },
                                },

                                userEmailIsVerified: {
                                    type: 'final',
                                },
                            },

                            onDone: {
                                target: '#app.reconnectingSocketConnection',
                            },
                        },

                        resendingConfirmationEmail: {
                            initial: 'idle',

                            states: {
                                idle: {
                                    on: {
                                        RESEND_CONFIRMATION_EMAIL: {
                                            target: 'requestingResendingConfirmationEmail',
                                        },
                                    },
                                },

                                requestingResendingConfirmationEmail: {
                                    invoke: {
                                        src: 'resendConfirmationEmail',

                                        onDone: [
                                            {
                                                cond: 'hasReachedRateLimitForResendingConfirmationEmail',

                                                target: 'idle',

                                                actions:
                                                    'showToastForRateLimitedConfirmationEmailResending',
                                            },
                                            {
                                                target: 'idle',

                                                actions:
                                                    'showToastForSuccessfulConfirmationEmailResending',
                                            },
                                        ],

                                        onError: {
                                            target: 'idle',

                                            actions:
                                                'showToastForFailedConfirmationEmailResending',
                                        },
                                    },
                                },
                            },
                        },

                        signingOut: {
                            initial: 'idle',

                            states: {
                                idle: {},

                                performSignOut: {
                                    invoke: {
                                        id: 'signOut',

                                        src: 'signOut',

                                        onDone: {
                                            target: '#app.loadingAuthenticationTokenFromAsyncStorage',
                                            actions:
                                                'sendBroadcastReloadIntoBroadcastChannel',
                                        },
                                    },

                                    on: {
                                        SIGN_OUT: undefined,
                                    },
                                },
                            },

                            on: {
                                SIGN_OUT: {
                                    target: '.performSignOut',
                                },
                            },
                        },
                    },
                },

                reconnectingSocketConnection: {
                    tags: ['showApplicationLoader', 'userIsAuthenticated'],

                    invoke: {
                        src: 'reconnectSocket',

                        onDone: {
                            target: 'waitingForServerToAcknowledgeSocketConnection',
                        },
                    },
                },

                waitingForServerToAcknowledgeSocketConnection: {
                    tags: ['showApplicationLoader', 'userIsAuthenticated'],

                    initial: 'fetching',

                    states: {
                        fetching: {
                            after: {
                                500: {
                                    target: 'debouncing',
                                },
                            },

                            invoke: {
                                id: 'fetchAcknowledgementStatus',

                                src: () => (sendBack) => {
                                    socket.emit(
                                        'GET_HAS_ACKNOWLEDGED_CONNECTION',
                                        () => {
                                            sendBack(
                                                appModel.events.ACKNOWLEDGE_SOCKET_CONNECTION(),
                                            );
                                        },
                                    );
                                },
                            },
                        },

                        debouncing: {
                            after: {
                                500: {
                                    target: 'fetching',
                                },
                            },
                        },
                    },

                    on: {
                        ACKNOWLEDGE_SOCKET_CONNECTION: {
                            target: 'childMachineProxy',
                        },
                    },
                },

                childMachineProxy: {
                    tags: 'userIsAuthenticated',

                    invoke: [
                        {
                            id: 'appUserMachine',

                            src: createUserMachine({
                                locationPollingTickDelay,
                                socket,
                            }).withConfig(userMachineOptions),
                        },

                        {
                            id: 'appMusicPlayerMachine',

                            src: createAppMusicPlayerMachine({
                                socket,
                            }).withConfig(musicPlayerMachineOptions),
                        },

                        {
                            id: 'appMusicPlaylistsMachine',

                            src: createAppMusicPlaylistsMachine({
                                socket,
                            }).withConfig(appMusicPlaylistsMachineOptions),
                        },
                    ],

                    on: {
                        REQUEST_LOCATION_PERMISSION: {
                            actions: forwardTo('appUserMachine'),
                        },

                        JOIN_ROOM: {
                            actions: forwardTo('appMusicPlayerMachine'),
                        },

                        __ENTER_MPE_EXPORT_TO_MTV: {
                            actions: forwardTo('appMusicPlayerMachine'),
                        },

                        __EXIT_MPE_EXPORT_TO_MTV: {
                            actions: forwardTo('appMusicPlayerMachine'),
                        },

                        SIGN_OUT: {
                            target: 'handleSignOut',
                        },
                    },
                },

                handleSignOut: {
                    invoke: {
                        id: 'signOut',

                        src: 'signOut',

                        onDone: {
                            target: '#app.loadingAuthenticationTokenFromAsyncStorage',
                            actions: 'sendBroadcastReloadIntoBroadcastChannel',
                        },
                    },
                },
            },

            on: {
                __BROADCAST_RELOAD_INTO_BROADCAST_CHANNEL: {
                    cond: 'platformOsIsWeb',
                    actions: forwardTo('broadcastChannelService'),
                },

                __RECEIVED_RELOAD_PAGE: {
                    cond: 'platformOsIsWeb',
                    actions: 'reloadPage',
                },
            },
        },
        {
            services: {
                fetchUser: async () => {
                    const me = await getMyProfileInformation();

                    return me;
                },

                reconnectSocket: async (_context) => {
                    if (SHOULD_USE_TOKEN_AUTH) {
                        const token = await request.getToken();
                        invariant(
                            token !== undefined,
                            'retrieved token is undefined reconnectSocket',
                        );

                        socket.auth = {
                            Authorization: `Bearer ${token}`,
                        };
                    }
                    socket.disconnect();
                    socket.connect();
                },

                sendGoogleUserAccessTokenToServer: async ({
                    userGoogleAccessToken,
                }) => {
                    invariant(
                        userGoogleAccessToken !== undefined,
                        'access token must be defined to be sent to server',
                    );

                    return await sendAuthenticateWithGoogleAccount({
                        userGoogleAccessToken,
                    });
                },

                signIn: async ({
                    email,
                    password,
                }): Promise<SignInResponseBody> => {
                    invariant(
                        email !== undefined,
                        'Email must have been set before signing in',
                    );
                    invariant(
                        password !== undefined,
                        'Email must have been set before signing in',
                    );

                    return await sendSignIn({
                        email,
                        password,
                    });
                },

                signOut: signingOutMachine,

                loadAuthenticationTokenFromAsyncStorage: async () => {
                    await request.loadToken();
                },

                sendConfirmationCode: async ({ confirmationCode }) => {
                    invariant(
                        confirmationCode !== undefined,
                        'sendConfirmationCode service must be called after confirmationCode has been assigned a non-empty value to context',
                    );

                    const responseBody = await sendEmailConfirmationCode({
                        code: confirmationCode,
                    });

                    return responseBody;
                },

                resendConfirmationEmail:
                    async (): Promise<ResendConfirmationEmailResponseBody> => {
                        const responseBody =
                            await sendResendingConfirmationEmail();

                        return responseBody;
                    },

                requestPasswordReset: async ({ email }) => {
                    invariant(
                        email !== undefined,
                        'Service must be called after an email has been assigned to context',
                    );

                    return await sendRequestingPasswordReset({
                        email,
                    });
                },

                validatePasswordResetCode: async ({
                    email,
                    passwordResetCode,
                }) => {
                    invariant(
                        email !== undefined && passwordResetCode !== undefined,
                        'Service must be called after an email and a password reset code have been assigned to context',
                    );

                    return await sendValidatePasswordResetCode({
                        email,
                        code: passwordResetCode,
                    });
                },
            },

            actions: {
                reloadPage: () => {
                    invariant(
                        window !== undefined && window !== null,
                        'window is undefined',
                    );

                    window.location.reload();
                },

                sendBroadcastReloadIntoBroadcastChannel: send(() => ({
                    type: '__BROADCAST_RELOAD_INTO_BROADCAST_CHANNEL',
                })),

                showToastForRateLimitedConfirmationEmailResending: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'You have reached the limit of resending confirmation emails',
                    });
                },

                showToastForSuccessfulConfirmationEmailResending: () => {
                    Toast.show({
                        type: 'success',
                        text1: 'You should have received a new confirmation email',
                    });
                },

                showToastForFailedConfirmationEmailResending: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'An error occured while trying to resend your confirmation email. Please try again later',
                    });
                },

                showToastForRateLimitedPasswordResetRequests: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Password reset request failed',
                        text2: 'Too much requests have been made in the last hour, please wait',
                    });
                },

                showToastForFailedPasswordResetAsEmailIsInvalid: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Password reset request failed',
                        text2: 'The email you provided is invalid',
                    });
                },

                showToastForSuccessfulPasswordReset: () => {
                    Toast.show({
                        type: 'success',
                        text1: 'Password reset request succeeded',
                        text2: 'We sent you an email with a code in it.',
                    });
                },

                showToastForFailedPasswordReset: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Password reset request failed',
                        text2: 'An unexpected error occured, please try again later',
                    });
                },

                redirectToPasswordResetTokenScreen: () => {
                    navigateFromRef('PasswordResetConfirmationToken');
                },

                showToastForValidPasswordResetCode: () => {
                    Toast.show({
                        type: 'success',
                        text1: 'Confirmed validity of the code',
                    });
                },

                showToastForUnknownErrorDuringPasswordResetCodeValidation:
                    () => {
                        Toast.show({
                            type: 'error',
                            text1: 'Validation of the code failed',
                            text2: 'An unexpected error occured, please try again later',
                        });
                    },
                //Google oauth authentication
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
                ///

                //Google server accessToken verification actions
                googleAuthenticationDisplayServerEmailNorNicknameInvalidToastError:
                    () => {
                        Toast.show({
                            type: 'error',
                            text1: 'Continue with google error',
                            text2: 'Google account nickname or email is invalid',
                        });
                    },
                googleAuthenticationServerEmailNorNicknameUnavailableToastError:
                    () => {
                        Toast.show({
                            type: 'error',
                            text1: 'Continue with google error',
                            text2: 'Google account nickname or email is unavailable',
                        });
                    },
                googleAuthenticationDisplayServerUnknownError: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Continue with google error',
                        text2: 'We encountered an error please try again later',
                    });
                },
                googleAuthenticationDisplayServerOperationSuccess: () => {
                    Toast.show({
                        type: 'success',
                        text1: 'Continue with google succeeded',
                    });
                },
                ///
            },

            delays: {
                POLLING_EMAIL_VERIFICATION_STATUS_DELAY: IS_TEST ? 500 : 5000,
            },

            guards: {
                submittedSigningInCredentialsAreInvalid: (_context, e) => {
                    const event = e as DoneInvokeEvent<SignInResponseBody>;

                    return event.data.status === 'INVALID_CREDENTIALS';
                },
                shouldUseWebAuth: () => !SHOULD_USE_TOKEN_AUTH,

                platformOsIsWeb: () => PLATFORM_OS_IS_WEB,

                userEmailIsNotConfirmed: ({ myProfileInformation }) => {
                    if (myProfileInformation === undefined) {
                        return true;
                    }

                    const hasConfirmedEmail =
                        myProfileInformation.hasConfirmedEmail === true;
                    const hasNotConfirmedEmail = hasConfirmedEmail === false;

                    return hasNotConfirmedEmail;
                },

                isConfirmationCodeInvalid: (_context, e) => {
                    const event =
                        e as DoneInvokeEvent<ConfirmEmailResponseBody>;

                    return event.data.status === 'INVALID_TOKEN';
                },

                hasReachedRateLimitForResendingConfirmationEmail: (
                    _context,
                    e,
                ) => {
                    const event =
                        e as DoneInvokeEvent<ResendConfirmationEmailResponseBody>;

                    return event.data.status === 'REACHED_RATE_LIMIT';
                },

                hasReachedRateLimitForPasswordResetRequests: (_context, e) => {
                    const event =
                        e as DoneInvokeEvent<RequestPasswordResetResponseBody>;

                    return event.data.status === 'REACHED_RATE_LIMIT';
                },

                isProvidedEmailInvalid: (_context, e) => {
                    const event =
                        e as DoneInvokeEvent<RequestPasswordResetResponseBody>;

                    return event.data.status === 'INVALID_EMAIL';
                },

                isPasswordResetCodeInvalid: (_context, e) => {
                    const event =
                        e as DoneInvokeEvent<ValidatePasswordResetTokenResponseBody>;

                    return event.data.status === 'INVALID_TOKEN';
                },
                //Google authentication guards
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
                ///

                //Google authentication server errors
                googleAuthenticationServerEmailNorNicknameInvalidError: (
                    _context,
                    e,
                ) => {
                    const event =
                        e as DoneInvokeEvent<AuthenticateWithGoogleOauthFailureReponseBody>;

                    return (
                        event.data.googleAuthSignUpFailure.includes(
                            'INVALID_EMAIL',
                        ) ||
                        event.data.googleAuthSignUpFailure.includes(
                            'INVALID_NICKNAME',
                        )
                    );
                },

                googleAuthenticationServerEmailNorNicknameUnavailableError: (
                    _context,
                    e,
                ) => {
                    const event =
                        e as DoneInvokeEvent<AuthenticateWithGoogleOauthFailureReponseBody>;

                    return (
                        event.data.googleAuthSignUpFailure.includes(
                            'UNAVAILABLE_EMAIL',
                        ) ||
                        event.data.googleAuthSignUpFailure.includes(
                            'UNAVAILABLE_NICKNAME',
                        )
                    );
                },
                ///
            },
        },
    );
}

const signingOutMachine = createMachine(
    {
        id: 'Signing out',

        initial: 'sendingSignOutToServer',

        states: {
            sendingSignOutToServer: {
                invoke: {
                    src: 'signOut',

                    onDone: {
                        target: 'clearingAsyncStorage',
                    },

                    onError: {
                        target: 'clearingAsyncStorage',
                    },
                },
            },

            clearingAsyncStorage: {
                invoke: {
                    src: 'clearAsyncStorage',

                    onDone: {
                        target: 'clearedAsyncStorage',
                    },

                    onError: {
                        target: 'clearedAsyncStorage',
                    },
                },
            },

            clearedAsyncStorage: {
                type: 'final',
            },
        },
    },
    {
        services: {
            signOut: async (): Promise<SignOutResponseBody> => {
                return await sendSignOut();
            },

            clearAsyncStorage: async (): Promise<void> => {
                return await request.clearToken();
            },
        },
    },
);
