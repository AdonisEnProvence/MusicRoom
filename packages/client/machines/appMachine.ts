import {
    GetMyProfileInformationResponseBody,
    SignInResponseBody,
    SignInSuccessfulResponseBody,
} from '@musicroom/types';
import invariant from 'tiny-invariant';
import {
    assign,
    ContextFrom,
    DoneInvokeEvent,
    EventFrom,
    forwardTo,
    Interpreter,
    StateMachine,
} from 'xstate';
import { SocketClient } from '../contexts/SocketContext';
import { sendSignIn } from '../services/AuthenticationService';
import { request, SHOULD_USE_TOKEN_AUTH } from '../services/http';
import { getMyProfileInformation } from '../services/UsersSearchService';
import { appModel } from './appModel';
import { createAppMusicPlayerMachine } from './appMusicPlayerMachine';
import { createAppMusicPlaylistsMachine } from './appMusicPlaylistsMachine';
import { createUserMachine } from './appUserMachine';
import { AppMusicPlayerMachineOptions } from './options/appMusicPlayerMachineOptions';
import { AppMusicPlaylistsOptions } from './options/appMusicPlaylistsMachineOptions';
import { AppUserMachineOptions } from './options/appUserMachineOptions';

interface CreateAppMachineArgs {
    locationPollingTickDelay: number;
    socket: SocketClient;
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
                                userID: (_context, e) => {
                                    const event =
                                        e as DoneInvokeEvent<GetMyProfileInformationResponseBody>;

                                    return event.data.userID;
                                },
                            }),
                            target: 'reconnectingSocketConnection',
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
                                                actions: assign({
                                                    userID: (_context, e) => {
                                                        const event =
                                                            e as DoneInvokeEvent<SignInSuccessfulResponseBody>;

                                                        return event.data
                                                            .userSummary.userID;
                                                    },
                                                }),
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
                                target: '#app.reconnectingSocketConnection',
                            },
                        },

                        SigningUp: {
                            initial: 'waitingForSignUpFormSubmitSuccess',
                            states: {
                                waitingForSignUpFormSubmitSuccess: {
                                    on: {
                                        SIGNED_UP_SUCCESSFULLY: {
                                            actions: appModel.assign({
                                                userID: (_, event) =>
                                                    event.userID,
                                            }),
                                            target: 'successfullySubmittedSignUpCredentials',
                                        },
                                    },
                                },

                                successfullySubmittedSignUpCredentials: {
                                    type: 'final',
                                },
                            },

                            onDone: {
                                target: '#app.reconnectingSocketConnection',
                            },
                        },
                    },
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
                    },
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

                loadAuthenticationTokenFromAsyncStorage: async () => {
                    await request.loadToken();
                },
            },

            guards: {
                submittedSigningInCredentialsAreInvalid: (_context, e) => {
                    const event = e as DoneInvokeEvent<SignInResponseBody>;

                    return event.data.status === 'INVALID_CREDENTIALS';
                },
                shouldUseWebAuth: () => !SHOULD_USE_TOKEN_AUTH,
            },
        },
    );
}
