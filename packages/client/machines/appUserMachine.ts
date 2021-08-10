import { UserDevice } from '@musicroom/types';
import { assign, createMachine, State, StateMachine } from 'xstate';
import { SocketClient } from '../hooks/useSocket';

export type AppUserMachineContext = {
    devices: UserDevice[];
};

type CreateUserMachineArgs = {
    socket: SocketClient;
};

export type AppUserMachineEvent = {
    type: 'CONNECTED_DEVICES_UPDATE';
    devices: UserDevice[];
};

export const createUserMachine = ({
    socket,
}: CreateUserMachineArgs): StateMachine<
    AppUserMachineContext,
    any,
    AppUserMachineEvent
> =>
    createMachine<AppUserMachineContext, AppUserMachineEvent>(
        {
            context: {
                devices: [],
            },

            invoke: {
                id: 'socketConnection',
                src: (_context, _event) => (sendBack, onReceive) => {
                    socket.on('CONNECTED_DEVICES_UPDATE', (devices) => {
                        console.log('RECEIVED FORCED DISCONNECTION');
                        sendBack({
                            type: 'CONNECTED_DEVICES_UPDATE',
                            devices,
                        });
                    });
                },
            },

            initial: 'pullDevices',

            states: {
                pullDevices: {
                    invoke: {
                        src: 'syncPullDevices',
                    },
                },
            },

            on: {
                CONNECTED_DEVICES_UPDATE: {
                    actions: 'updateUserDevices',
                },
            },
        },
        {
            actions: {
                updateUserDevices: assign((context, event) => {
                    if (event.type !== 'CONNECTED_DEVICES_UPDATE') {
                        return context;
                    }

                    return {
                        ...context,
                        devices: event.devices,
                    };
                }),
            },

            guards: {},
            services: {
                syncPullDevices: (_context, _event) => (sendBack) => {
                    socket.emit('GET_CONNECTED_DEVICES', ({ devices }) => {
                        sendBack({ type: 'CONNECTED_DEVICES_UPDATE', devices });
                    });
                },
            },
        },
    );

export type AppUserMachineState = State<
    AppUserMachineContext,
    AppUserMachineEvent
>;
