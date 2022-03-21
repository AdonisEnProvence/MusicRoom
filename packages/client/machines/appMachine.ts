import {
    GetMyProfileInformationResponseBody,
    SignInResponseBody,
    SignOutResponseBody,
} from '@musicroom/types';
import invariant from 'tiny-invariant';
import {
    assign,
    ContextFrom,
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
import { SocketClient } from '../contexts/SocketContext';
import { sendSignIn, sendSignOut } from '../services/AuthenticationService';
import { request, SHOULD_USE_TOKEN_AUTH } from '../services/http';
import { getMyProfileInformation } from '../services/UsersSearchService';
import { appModel } from './appModel';
import { createAppMusicPlayerMachine } from './appMusicPlayerMachine';
import { createAppMusicPlaylistsMachine } from './appMusicPlaylistsMachine';
import { createUserMachine } from './appUserMachine';
import { AppMusicPlayerMachineOptions } from './options/appMusicPlayerMachineOptions';
import { AppMusicPlaylistsOptions } from './options/appMusicPlaylistsMachineOptions';
import { AppUserMachineOptions } from './options/appUserMachineOptions';
import { PLATFORM_OS_IS_WEB } from './utils';

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
                },

                reconnectingSocketConnection: {
                    tags: ['showApplicationLoader', 'userIsAuthenticated'],

                    invoke: {
                        src: 'reconnectSocket',
                        onDone: {
                            target: '#app.waitingForServerToAcknowledgeSocketConnection',
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
                            target: '#app.handleSignOut',
                        },
                    },
                },

                handleSignOut: {
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
                                    target: '#app.loadingAuthenticationTokenFromAsyncStorage',
                                    actions:
                                        'sendBroadcastReloadIntoBroadcastChannel',
                                },

                                onError: {
                                    target: '#app.loadingAuthenticationTokenFromAsyncStorage',
                                    actions:
                                        'sendBroadcastReloadIntoBroadcastChannel',
                                },
                            },
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

                signOut: async (): Promise<SignOutResponseBody> => {
                    return await sendSignOut();
                },

                clearAsyncStorage: async (): Promise<void> => {
                    return await request.clearToken();
                },

                loadAuthenticationTokenFromAsyncStorage: async () => {
                    await request.loadToken();
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
            },

            guards: {
                submittedSigningInCredentialsAreInvalid: (_context, e) => {
                    const event = e as DoneInvokeEvent<SignInResponseBody>;

                    return event.data.status === 'INVALID_CREDENTIALS';
                },
                shouldUseWebAuth: () => !SHOULD_USE_TOKEN_AUTH,
                platformOsIsWeb: () => PLATFORM_OS_IS_WEB,
                userEmailIsNotConfirmed: (_context) => {
                    const userEmailIsConfirmed = true as boolean;

                    return userEmailIsConfirmed === false;
                },
            },
        },
    );
}
