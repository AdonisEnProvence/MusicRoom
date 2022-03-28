import {
    AllClientToServerEvents,
    AllServerToClientEvents,
    UserDevice,
} from '@musicroom/types';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import Ws from 'App/Services/Ws';
import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import MtvRoom from 'App/Models/MtvRoom';
import { DateTime } from 'luxon';
import HttpContext from '@ioc:Adonis/Core/HttpContext';
import AuthManager from '@ioc:Adonis/Addons/Auth';
import User from 'App/Models/User';
import invariant from 'tiny-invariant';
import Bouncer from '@ioc:Adonis/Addons/Bouncer';
import initMtvSocketEventListeners from './mtvSocket';
import initMpeSocketEventListeners from './mpeSocket';

Ws.boot();

export type TypedSocket = Socket<
    AllClientToServerEvents,
    AllServerToClientEvents,
    DefaultEventsMap
>;

//TODO we should be using zod to parse every payload coming from the client

Ws.io
    .use(async (socket, next) => {
        const apiAuthToken: undefined | string =
            socket.handshake.auth.Authorization;
        if (apiAuthToken) {
            socket.request.headers.authorization = apiAuthToken;
        }
        const ctx = HttpContext.create('/', {}, socket.request);
        const auth = AuthManager.getAuthForRequest(ctx);

        if (apiAuthToken) {
            try {
                const user = await auth.use('api').authenticate();

                socket.handshake['user'] = user;
                console.log('user is authenticated');
                next();
            } catch (e) {
                console.log('Error api token auth socket is not authenticated');
                next(
                    new Error(
                        'User must be authenticated to perform socket protocol',
                    ),
                );
            }
        } else {
            try {
                await ctx.session.initiate(false);
                const user = await auth.use('web').authenticate();

                console.log('user is authenticated');
                socket.handshake['user'] = user;
                next();
            } catch (e) {
                console.log('Error web auth socket is not authenticated');
                next(
                    new Error(
                        'User must be authenticated to perform socket protocol',
                    ),
                );
            }
        }
    })
    .use(async (socket, next) => {
        const user = socket.handshake['user'];
        invariant(
            user instanceof User,
            'User must be authenticated to perform socket connection',
        );

        const bouncer = Bouncer.forUser(user);

        const accountIsNotConfirmed =
            (await bouncer.denies('hasConfirmedEmail')) === true;
        if (accountIsNotConfirmed === true) {
            next(
                new Error(
                    'User must confirm email to perform socket connection',
                ),
            );

            return;
        }

        next();
    })
    .on('connection', async (socket) => {
        try {
            const userAuth: User = socket.handshake['user'];
            invariant(
                userAuth instanceof User,
                'socket io authentication user is corrupted',
            );

            const hasDeviceNotBeenFound =
                (await Device.findBy('socket_id', socket.id)) === null;
            if (hasDeviceNotBeenFound) {
                //Registering the new device in the Device model + relationship with user
                const newDevice = await SocketLifecycle.registerDevice(
                    socket,
                    userAuth.uuid,
                );

                //Looking for mtvRoom to sync to the new device
                await SocketLifecycle.registeredDeviceLookForMtvContext({
                    socket,
                    newDevice,
                });

                //Looking for mpeRooms to sync to the new device
                await SocketLifecycle.registeredDeviceLookForMpeContext({
                    socket,
                    newDevice,
                });
            } else {
                console.log('socketID already registered');
            }

            socket.on('GET_HAS_ACKNOWLEDGED_CONNECTION', (onAcknowledged) => {
                onAcknowledged();
            });

            /// USER ///
            socket.on(
                'GET_CONNECTED_DEVICES_AND_DEVICE_ID',
                async (callback) => {
                    try {
                        const {
                            user: { uuid: userID },
                        } = await SocketLifecycle.getSocketConnectionCredentials(
                            socket,
                        );

                        const devices =
                            await UserService.getUserConnectedDevices(userID);
                        const formattedDevices: UserDevice[] = devices.map(
                            (device) => ({
                                deviceID: device.uuid,
                                name: device.name,
                            }),
                        );
                        const currDevice = devices.find(
                            (device) => device.socketID === socket.id,
                        );

                        if (currDevice === undefined || currDevice === null) {
                            throw new Error(
                                'currDeviceID should not be undefined',
                            );
                        }

                        callback({
                            devices: formattedDevices,
                            currDeviceID: currDevice.uuid,
                        });
                    } catch (e) {
                        console.error(e);
                    }
                },
            );

            socket.on('UPDATE_DEVICE_POSITION', async (coords) => {
                try {
                    const { deviceID, user, mtvRoomID } =
                        await SocketLifecycle.getSocketConnectionCredentials(
                            socket,
                        );
                    const device = await Device.findOrFail(deviceID);
                    device.merge({
                        ...coords,
                        latLngUpdatedAt: DateTime.now(),
                    });
                    await device.save();

                    if (mtvRoomID !== undefined) {
                        const mtvRoom = await MtvRoom.findOrFail(mtvRoomID);

                        const {
                            constraintLat,
                            constraintLng,
                            constraintRadius,
                            hasPositionAndTimeConstraints,
                            runID,
                            uuid: roomID,
                        } = mtvRoom;
                        await MtvRoomsWsController.checkUserDevicesPositionIfRoomHasPositionConstraints(
                            {
                                user,
                                persistToTemporalRequiredInformation: {
                                    roomID,
                                    runID,
                                },
                                roomConstraintInformation: {
                                    constraintLat,
                                    constraintLng,
                                    constraintRadius,
                                    hasPositionAndTimeConstraints,
                                },
                            },
                        );
                    }
                } catch (e) {
                    console.error(e);
                }
            });

            /// //// ///

            //MtvRoom listeners
            initMtvSocketEventListeners(socket);
            ///

            //MpeRoom listeners
            initMpeSocketEventListeners(socket);
            ///

            socket.on('disconnecting', async () => {
                try {
                    await SocketLifecycle.deleteDeviceAndCheckForMtvRoomDeletion(
                        socket.id,
                    );
                } catch (e) {
                    console.error('Error on socket.on(disconnecting)', e);
                }
            });
        } catch (e) {
            console.log('il se passe qqlch ici');
            console.error(e);
        }
    });
