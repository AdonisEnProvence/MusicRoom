import invariant from 'tiny-invariant';
import {
    ContextFrom,
    EventFrom,
    forwardTo,
    Interpreter,
    StateMachine,
} from 'xstate';
import { SocketClient } from '../contexts/SocketContext';
import { getMe, sendSignIn } from '../services/AuthenticationService';
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

            initial: 'fetchingInitialUserAuthenticationState',

            states: {
                fetchingInitialUserAuthenticationState: {
                    tags: 'showApplicationLoader',

                    invoke: {
                        src: 'fetchUser',

                        onDone: {
                            target: 'waitingForServerToAcknowledgeSocketConnection',
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
                                waitingForCredentials: {
                                    on: {
                                        SIGN_IN: {
                                            target: 'submitingCredentials',

                                            actions: appModel.assign({
                                                email: (_, event) =>
                                                    event.email,
                                                password: (_, event) =>
                                                    event.password,
                                            }),
                                        },
                                    },
                                },

                                submitingCredentials: {
                                    invoke: {
                                        src: 'signIn',

                                        onDone: {
                                            target: '#app.waitingForServerToAcknowledgeSocketConnection',

                                            actions: 'reconnectSocket',
                                        },

                                        onError: {
                                            target: 'waitingForCredentials',

                                            // actions: 'showSignInError',
                                        },
                                    },
                                },
                            },
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
                                    target: 'deboucing',
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

                        deboucing: {
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
                    const me = await getMe();

                    return me;
                },

                signIn: async ({ email, password }) => {
                    invariant(
                        email !== undefined,
                        'Email must have been set before signing in',
                    );
                    invariant(
                        password !== undefined,
                        'Email must have been set before signing in',
                    );

                    await sendSignIn({
                        email,
                        password,
                    });
                },
            },

            actions: {
                reconnectSocket: () => {
                    socket.disconnect();
                    socket.connect();
                },
            },
        },
    );
}
