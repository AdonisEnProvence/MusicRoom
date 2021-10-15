import { createMachine, forwardTo, State, StateMachine } from 'xstate';
import { SocketClient } from '../contexts/SocketContext';
import { createAppMusicPlayerMachine } from './appMusicPlayerMachine';
import { createUserMachine } from './appUserMachine';
import { AppMusicPlayerMachineOptions } from './options/appMusicPlayerMachineOptions';
import { AppUserMachineOptions } from './options/appUserMachineOptions';

export type AppAppMachineContext = {
    eslint: boolean;
};

type CreateAppMachineArgs = {
    locationPollingTickDelay: number;
    socket: SocketClient;
    musicPlayerMachineOptions: AppMusicPlayerMachineOptions;
    userMachineOptions: AppUserMachineOptions;
};

export type AppAppMachineEvent = {
    type: 'REQUEST_LOCATION_PERMISSION';
};

export const createAppMachine = ({
    locationPollingTickDelay,
    socket,
    musicPlayerMachineOptions,
    userMachineOptions,
}: CreateAppMachineArgs): StateMachine<
    AppAppMachineContext,
    any,
    AppAppMachineEvent
> =>
    createMachine<AppAppMachineContext, AppAppMachineEvent>({
        initial: 'childMachineProxy',

        states: {
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
                ],
                on: {
                    REQUEST_LOCATION_PERMISSION: {
                        actions: forwardTo('userMachine'),
                    },
                },
            },
        },
    });

export type AppAppMachineState = State<
    AppAppMachineContext,
    AppAppMachineEvent
>;
