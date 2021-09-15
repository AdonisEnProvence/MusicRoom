import { UserDevice } from '@musicroom/types';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import Toast from 'react-native-toast-message';
import { assign, createMachine, send, State, StateMachine } from 'xstate';
import { SocketClient } from '../hooks/useSocket';

export type AppUserMachineContext = {
    devices: UserDevice[];
    currDeviceID: string | undefined;

    locationPermission: boolean;
    location?: LocationObject;
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
          type: 'UPDATE_CURRENT_LOCATION';
          params: {
              location: Location.LocationObject;
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
                locationPermission: false,
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

            type: 'parallel',

            states: {
                pullDevices: {
                    invoke: {
                        src: 'syncPullDevices',
                    },
                },

                locationHandler: {
                    initial: 'idle',
                    states: {
                        idle: {
                            on: {
                                REQUEST_LOCATION_PERMISSION: {
                                    target: 'requestingLocationPermissions',
                                },
                            },
                        },

                        requestingLocationPermissions: {
                            invoke: {
                                src:
                                    (_context, _event) =>
                                    async (sendBack, _onReceive) => {
                                        console.log('WOWO THIS IS REALLY COOL');
                                        const { status } =
                                            await Location.requestForegroundPermissionsAsync();
                                        if (status !== 'granted') {
                                            Toast.show({
                                                type: 'error',
                                                text1: 'Permission to access location was denied',
                                            });
                                            console.error(
                                                'Permission to access location was denied',
                                            );
                                            sendBack(
                                                'LOCATION_PERMISSION_DENIED',
                                            );
                                            return false;
                                        }
                                        sendBack('LOCATION_PERMISSION_GRANTED');
                                    },
                            },
                            on: {
                                LOCATION_PERMISSION_DENIED: {
                                    target: 'idle',
                                    actions: 'updateLocationPermissions',
                                },

                                LOCATION_PERMISSION_GRANTED: {
                                    target: 'locationWatcher',
                                    actions: 'updateLocationPermissions',
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
                                        NO_UPDATE_NEEDED_GO_FOR_NEXT_TICK: {
                                            target: 'waitForNextTick',
                                        },

                                        UPDATE_CURRENT_LOCATION: {
                                            //SEND UPDATE TO ADONIS
                                            actions: ['updateCurrentLocation'],
                                            target: 'waitForNextTick',
                                        },

                                        UPDATE_CURRENT_LOCATION_FAIL: {
                                            actions: send({
                                                type: 'PERMISSION_EXPIRED',
                                            }),
                                        },
                                    },
                                },

                                waitForNextTick: {
                                    after: {
                                        1000: [
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
                                    target: 'requestingLocationPermissions',
                                },
                            },
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
                updateLocationPermissions: assign((context, event) => {
                    console.log('PLEASE DISPLAY THIS LOG');
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
                        location: event.params.location,
                    };
                }),
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

                getCurrentLocation: (context, event) => async (sendBack) => {
                    console.log('_'.repeat(100));
                    try {
                        if (!context.locationPermission) {
                            throw new Error(
                                "About to retrieve current location but doesn't have permissions to do so",
                            );
                        }

                        const location = await Location.getCurrentPositionAsync(
                            {
                                accuracy: Location.Accuracy.Balanced,
                                distanceInterval: 100,
                                mayShowUserSettingsDialog: false,
                                timeInterval: 1,
                            },
                        );

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
                                params: {
                                    location,
                                },
                            });
                        } else {
                            sendBack({
                                type: 'NO_UPDATE_NEEDED_GO_FOR_NEXT_TICK',
                            });
                        }
                    } catch (e) {
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
    return resultInKm / 1000;
}
