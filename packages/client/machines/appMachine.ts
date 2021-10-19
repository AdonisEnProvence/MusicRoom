import { ContextFrom, EventFrom, forwardTo, StateMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { SocketClient } from '../contexts/SocketContext';
import { createAppMusicPlayerMachine } from './appMusicPlayerMachine';
import { createUserMachine } from './appUserMachine';
import { AppMusicPlayerMachineOptions } from './options/appMusicPlayerMachineOptions';
import { AppUserMachineOptions } from './options/appUserMachineOptions';

const appMachineModel = createModel(
    {},
    {
        events: {
            JOIN_ROOM: (roomID: string) => ({ roomID }),
            REQUEST_LOCATION_PERMISSION: () => ({}),
        },
    },
);

interface CreateAppMachineArgs {
    locationPollingTickDelay: number;
    socket: SocketClient;
    musicPlayerMachineOptions: AppMusicPlayerMachineOptions;
    userMachineOptions: AppUserMachineOptions;
}

export const createAppMachine = ({
    socket,
    locationPollingTickDelay,
    musicPlayerMachineOptions,
    userMachineOptions,
}: CreateAppMachineArgs): StateMachine<
    ContextFrom<typeof appMachineModel>,
    any,
    EventFrom<typeof appMachineModel>
> => {
    return appMachineModel.createMachine({
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
                        actions: forwardTo('appUserMachine'),
                    },

                    JOIN_ROOM: {
                        actions: forwardTo('appMusicPlayerMachine'),
                    },
                },
            },
        },
    });
};
