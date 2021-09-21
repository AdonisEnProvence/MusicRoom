import { UserDevice } from '@musicroom/types';
import {
    getCurrentPositionAsync,
    LocationObject,
    requestForegroundPermissionsAsync,
} from 'expo-location';
import Toast from 'react-native-toast-message';
import {
    assign,
    createMachine,
    forwardTo,
    Receiver,
    send,
    Sender,
    State,
    StateMachine,
} from 'xstate';
import { SocketClient } from '../hooks/useSocket';

export type AppUserMachineContext = {
    devices: UserDevice[];
    currDeviceID: string | undefined;

    locationPermission: boolean;
    location?: LocationObject;
};

type CreateUserMachineArgs = {
    locationPollingTickDelay: number;
    socket: SocketClient;
};

export type AppUserMachineEvent =
    | {
          type: 'CONNECTED_DEVICES_UPDATE';
          devices: UserDevice[];
      }
    | {
          type: 'SET_CURRENT_DEVICE_ID';
          currDeviceID: string;
      }
    | { type: 'PERMISSION_EXPIRED' }
    | {
          type: 'REQUEST_LOCATION_PERMISSION';
      }
    | {
          type: 'UPDATE_CURRENT_LOCATION_FAIL';
      }
    | {
          type: 'LOCATION_PERMISSION_GRANTED';
      }
    | {
          type: 'NO_UPDATE_NEEDED_GO_FOR_NEXT_TICK';
      }
    | {
          type: 'LOCATION_PERMISSION_DENIED';
      }
    | {
          type: 'REQUEST_DEDUPLICATE_LOCATION_PERMISSION';
      }
    | {
          type: 'UPDATE_CURRENT_LOCATION';
          location: LocationObject;
      };

export const createUserMachine = ({
    locationPollingTickDelay,
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
                locationPermission: false,
            },

            invoke: {
                id: 'socketConnection',
                src:
                    (_context, _event) =>
                    (
                        sendBack: Sender<AppUserMachineEvent>,
                        onReceive: Receiver<AppUserMachineEvent>,
                    ) => {
                        socket.on('CONNECTED_DEVICES_UPDATE', (devices) => {
                            console.log('RECEIVED CONNECTED_DEVICES_UPDATE');
                            sendBack({
                                type: 'CONNECTED_DEVICES_UPDATE',
                                devices,
                            });
                        });

                        onReceive((e) => {
                            switch (e.type) {
                                case 'UPDATE_CURRENT_LOCATION': {
                                    socket.emit('UPDATE_DEVICE_POSITION', {
                                        lat: e.location.coords.latitude,
                                        lng: e.location.coords.longitude,
                                    });

                                    break;
                                }
                            }
                        });
                    },
            },

            type: 'parallel',

            states: {
                pullDevices: {
                    invoke: {
                        src: 'syncPullDevices',
                    },
                },

                locationHandler: {
                    type: 'parallel',
                    states: {
                        locationService: {
                            initial: 'idle',
                            states: {
                                idle: {},

                                requestingLocationPermissions: {
                                    invoke: {
                                        src: 'requestLocationPermission',
                                    },
                                    on: {
                                        LOCATION_PERMISSION_DENIED: {
                                            target: 'idle',
                                            actions: [
                                                'updateLocationPermissions',
                                                'printPermissionDeniedToast',
                                            ],
                                        },

                                        LOCATION_PERMISSION_GRANTED: {
                                            target: 'locationWatcher',
                                            actions:
                                                'updateLocationPermissions',
                                        },
                                    },
                                },

                                locationWatcher: {
                                    initial: 'retrieveCurrentLocation',

                                    states: {
                                        retrieveCurrentLocation: {
                                            invoke: {
                                                src: 'getCurrentLocation',
                                            },

                                            on: {
                                                NO_UPDATE_NEEDED_GO_FOR_NEXT_TICK:
                                                    {
                                                        target: 'waitForNextTick',
                                                    },

                                                UPDATE_CURRENT_LOCATION: {
                                                    actions: [
                                                        'updateCurrentLocation',
                                                        forwardTo(
                                                            'socketConnection',
                                                        ),
                                                    ],
                                                    target: 'waitForNextTick',
                                                },

                                                UPDATE_CURRENT_LOCATION_FAIL: {
                                                    actions: [
                                                        'printPermissionDeniedToast',
                                                        send({
                                                            type: 'PERMISSION_EXPIRED',
                                                        }),
                                                    ],
                                                },
                                            },
                                        },

                                        waitForNextTick: {
                                            after: {
                                                LOCATION_POLLING_TICK_DELAY: [
                                                    {
                                                        target: 'retrieveCurrentLocation',
                                                        cond: 'locationPermissionsAreGranted',
                                                    },
                                                    {
                                                        actions: send({
                                                            type: 'PERMISSION_EXPIRED',
                                                        }),
                                                    },
                                                ],
                                            },
                                        },
                                    },

                                    on: {
                                        PERMISSION_EXPIRED: {
                                            actions: 'resetDeviceLocation',
                                            target: 'requestingLocationPermissions',
                                        },
                                    },
                                },
                            },
                        },

                        deduplicating: {
                            initial: 'canPerformAction',

                            states: {
                                canPerformAction: {
                                    on: {
                                        REQUEST_DEDUPLICATE_LOCATION_PERMISSION:
                                            {
                                                target: 'deduplicating',
                                                actions: send({
                                                    type: 'REQUEST_LOCATION_PERMISSION',
                                                }),
                                            },
                                    },
                                },
                                deduplicating: {
                                    after: {
                                        REQUEST_LOCATION_PERMISSION_DEDUPLICATE_DELAY:
                                            {
                                                target: 'canPerformAction',
                                            },
                                    },
                                },
                            },
                        },
                    },

                    on: {
                        REQUEST_LOCATION_PERMISSION: {
                            target: '.locationService.requestingLocationPermissions',
                        },
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
                resetDeviceLocation: assign((context, _) => {
                    return {
                        ...context,
                        location: undefined,
                        locationPermission: false,
                    };
                }),

                printPermissionDeniedToast: assign((context, _) => {
                    Toast.show({
                        type: 'error',
                        text1: 'Permission to access location was denied',
                    });
                    return context;
                }),

                updateUserDevices: assign((context, event) => {
                    if (event.type !== 'CONNECTED_DEVICES_UPDATE') {
                        return context;
                    }

                    return {
                        ...context,
                        devices: event.devices,
                    };
                }),

                setCurrDeviceID: assign((context, event) => {
                    if (event.type !== 'SET_CURRENT_DEVICE_ID') {
                        return context;
                    }

                    if (event.currDeviceID === undefined) {
                        return context;
                    }

                    return {
                        ...context,
                        currDeviceID: event.currDeviceID,
                    };
                }),

                updateLocationPermissions: assign((context, event) => {
                    if (
                        event.type !== 'LOCATION_PERMISSION_GRANTED' &&
                        event.type !== 'LOCATION_PERMISSION_DENIED'
                    ) {
                        return context;
                    }
                    const permissionGranted =
                        event.type === 'LOCATION_PERMISSION_GRANTED';

                    return {
                        ...context,
                        locationPermission: permissionGranted,
                    };
                }),

                updateCurrentLocation: assign((context, event) => {
                    if (event.type !== 'UPDATE_CURRENT_LOCATION') {
                        return context;
                    }

                    return {
                        ...context,
                        location: event.location,
                    };
                }),
            },

            delays: {
                LOCATION_POLLING_TICK_DELAY: locationPollingTickDelay,
                REQUEST_LOCATION_PERMISSION_DEDUPLICATE_DELAY: 2000,
            },

            guards: {
                locationPermissionsAreGranted: (context) =>
                    context.locationPermission === true,
            },
            services: {
                syncPullDevices: (_context, _event) => (sendBack) => {
                    socket.emit(
                        'GET_CONNECTED_DEVICES_AND_DEVICE_ID',
                        ({ devices, currDeviceID }) => {
                            sendBack({
                                type: 'CONNECTED_DEVICES_UPDATE',
                                devices,
                            });

                            sendBack({
                                type: 'SET_CURRENT_DEVICE_ID',
                                currDeviceID,
                            });
                        },
                    );
                },

                requestLocationPermission:
                    (_context, _event) => async (sendBack, _onReceive) => {
                        try {
                            const { status } =
                                await requestForegroundPermissionsAsync();
                            if (status !== 'granted') {
                                console.error(
                                    'Permission to access location was denied',
                                );
                                sendBack('LOCATION_PERMISSION_DENIED');
                                return false;
                            }
                            sendBack('LOCATION_PERMISSION_GRANTED');
                        } catch (e) {
                            console.error(e);
                            sendBack('LOCATION_PERMISSION_DENIED');
                        }
                    },

                getCurrentLocation: (context, event) => async (sendBack) => {
                    console.log('_'.repeat(100));
                    try {
                        if (!context.locationPermission) {
                            throw new Error(
                                "About to retrieve current location but doesn't have permissions to do so",
                            );
                        }

                        console.log('asking for current location');
                        const location = await getCurrentPositionAsync({
                            accuracy: 4,
                            distanceInterval: 100,
                            mayShowUserSettingsDialog: false,
                            timeInterval: 1,
                        });
                        console.log(location.coords);
                        let needToUpdatePosition = true;
                        if (context.location !== undefined) {
                            const distanceBetweenTwoCoordsInMeters = distance(
                                location.coords.latitude,
                                location.coords.longitude,
                                context.location.coords.latitude,
                                context.location.coords.longitude,
                            );
                            console.log(
                                'DELTA',
                                distanceBetweenTwoCoordsInMeters,
                            );
                            if (distanceBetweenTwoCoordsInMeters < 100) {
                                needToUpdatePosition = false;
                            }
                        }

                        if (needToUpdatePosition) {
                            sendBack({
                                type: 'UPDATE_CURRENT_LOCATION',
                                location,
                            });
                        } else {
                            sendBack({
                                type: 'NO_UPDATE_NEEDED_GO_FOR_NEXT_TICK',
                            });
                        }
                    } catch (e) {
                        console.error(e);
                        sendBack({
                            type: 'UPDATE_CURRENT_LOCATION_FAIL',
                        });
                    }
                },
            },
        },
    );

export type AppUserMachineState = State<
    AppUserMachineContext,
    AppUserMachineEvent
>;

function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const p = 0.017453292519943295; // Math.PI / 180
    const c = Math.cos;
    const a =
        0.5 -
        c((lat2 - lat1) * p) / 2 +
        (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;

    const resultInKm = 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
    return resultInKm * 1000;
}
