import { ContextFrom, EventFrom, forwardTo, StateMachine } from 'xstate';
import { SocketClient } from '../contexts/SocketContext';
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

export const createAppMachine = ({
    socket,
    locationPollingTickDelay,
    musicPlayerMachineOptions,
    userMachineOptions,
    appMusicPlaylistsMachineOptions,
}: CreateAppMachineArgs): StateMachine<
    ContextFrom<typeof appModel>,
    any,
    EventFrom<typeof appModel>
> => {
    return appModel.createMachine({
        initial: 'waitingForServerToAcknowledgeSocketConnection',

        states: {
            waitingForServerToAcknowledgeSocketConnection: {
                tags: 'showApplicationLoader',

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

                        src: createAppMusicPlayerMachine({ socket }).withConfig(
                            musicPlayerMachineOptions,
                        ),
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
    });
};
