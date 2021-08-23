import { UserDevice } from '@musicroom/types';
import { assign, createMachine, State, StateMachine } from 'xstate';
import { SocketClient } from '../hooks/useSocket';

export type AppUserMachineContext = {
    devices: UserDevice[];
    currDeviceID: string | undefined;
};

type CreateUserMachineArgs = {
    socket: SocketClient;
};

export type AppUserMachineEvent =
    | {
          type: 'CONNECTED_DEVICES_UPDATE';
          params: {
              devices: UserDevice[];
          };
      }
    | {
          type: 'SET_CURRENT_DEVICE_ID';
          params: {
              currDeviceID: string;
          };
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
                currDeviceID: undefined,
            },

            invoke: {
                id: 'socketConnection',
                src: (_context, _event) => (sendBack, _onReceive) => {
                    socket.on('CONNECTED_DEVICES_UPDATE', (devices) => {
                        console.log('RECEIVED CONNECTED_DEVICES_UPDATE');
                        sendBack({
                            type: 'CONNECTED_DEVICES_UPDATE',
                            params: {
                                devices,
                            },
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
                SET_CURRENT_DEVICE_ID: {
                    actions: 'setCurrDeviceID',
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
                        devices: event.params.devices,
                    };
                }),
                setCurrDeviceID: assign((context, event) => {
                    if (event.type !== 'SET_CURRENT_DEVICE_ID') {
                        return context;
                    }

                    if (event.params.currDeviceID === undefined) {
                        return context;
                    }

                    return {
                        ...context,
                        currDeviceID: event.params.currDeviceID,
                    };
                }),
            },

            guards: {},
            services: {
                syncPullDevices: (_context, _event) => (sendBack) => {
                    socket.emit(
                        'GET_CONNECTED_DEVICES_AND_DEVICE_ID',
                        ({ devices, currDeviceID }) => {
                            console.log(
                                'SALUT LES COPAINS J "AI RECU DE MAMIE',
                                devices,
                                currDeviceID,
                            );
                            sendBack({
                                type: 'CONNECTED_DEVICES_UPDATE',
                                params: { devices },
                            });

                            console.log('JENVOIE LE RESTE A PAPI');
                            sendBack({
                                type: 'SET_CURRENT_DEVICE_ID',
                                params: { currDeviceID },
                            });
                        },
                    );
                },
            },
        },
    );

export type AppUserMachineState = State<
    AppUserMachineContext,
    AppUserMachineEvent
>;
