import {
    createMachine,
    forwardTo,
    MachineOptions,
    State,
    StateMachine,
} from 'xstate';
import { SocketClient } from '../contexts/SocketContext';
import {
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent,
    createAppMusicPlayerMachine,
} from './appMusicPlayerMachine';
import {
    AppUserMachineContext,
    AppUserMachineEvent,
    createUserMachine,
} from './appUserMachine';

export type AppAppMachineContext = {
    eslint: boolean;
};

type CreateAppMachineArgs = {
    locationPollingTickDelay: number;
    socket: SocketClient;
    musicPlayerMachineOptions: MachineOptions<
        AppMusicPlayerMachineContext,
        AppMusicPlayerMachineEvent
    >;
    userMachineOptions: MachineOptions<
        AppUserMachineContext,
        AppUserMachineEvent
    >;
};

export type AppAppMachineEvent = {
    type: 'REQUEST_LOCATION_PERMISSION';
};

export const createAppMachine = ({
    locationPollingTickDelay,
    socket,
    musicPlayerMachineOptions,
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
                        }),
                    },
                    {
                        id: 'appMusicPlayerMachine',
                        src: createAppMusicPlayerMachine({ socket }),
                        options: musicPlayerMachineOptions,
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
