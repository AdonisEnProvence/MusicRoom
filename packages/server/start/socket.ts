import {
    AllClientToServerEvents,
    AllServerToClientEvents,
    UserDevice,
} from '@musicroom/types';
import ChatController from 'App/Controllers/Ws/ChatController';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import Ws from 'App/Services/Ws';
import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

Ws.boot();

export type TypedSocket = Socket<
    AllClientToServerEvents,
    AllServerToClientEvents,
    DefaultEventsMap
>;

//TODO we should be using zod to parse every payload coming from the client

Ws.io.on('connection', async (socket) => {
    try {
        ChatController.onConnect({ socket, payload: undefined });

        const hasDeviceNotBeenFound =
            (await Device.findBy('socket_id', socket.id)) === null;
        if (hasDeviceNotBeenFound) {
            await SocketLifecycle.registerDevice(socket);
        } else {
            console.log('socketID already registered');
        }
        /// CHAT ///
        socket.on('NEW_MESSAGE', (payload) => {
            ChatController.onWriteMessage({ socket, payload });
        });
        /// //// ///

        /// USER ///
        socket.on('GET_CONNECTED_DEVICES_AND_DEVICE_ID', async (callback) => {
            try {
                const {
                    user: { uuid: userID },
                } = await SocketLifecycle.getSocketConnectionCredentials(
                    socket,
                );

                const devices = await UserService.getUserConnectedDevices(
                    userID,
                );
                const formattedDevices: UserDevice[] = devices.map(
                    (device) => ({
                        deviceID: device.uuid,
                        name: device.name,
                    }),
                );
                const currDevice = devices.find(
                    (device) => device.socketID === socket.id,
                );

                if (currDevice === undefined) {
                    throw new Error('currDeviceID should not be undefined');
                }

                callback({
                    devices: formattedDevices,
                    currDeviceID: currDevice.uuid,
                });
            } catch (e) {
                console.error(e);
            }
        });
        /// //// ///

        /// ROOM ///
        socket.on('CREATE_ROOM', async (payload) => {
            try {
                const {
                    user,
                    deviceID,
                    mtvRoomID: currMtvRoomID,
                } = await SocketLifecycle.getSocketConnectionCredentials(
                    socket,
                );

                if (!payload.name) {
                    throw new Error('CREATE_ROOM failed name should be empty');
                }

                /**
                 * Checking if user needs to leave previous
                 * mtv room before creating new one
                 */
                if (currMtvRoomID !== undefined) {
                    console.log(
                        `User needs to leave current room before joining new one`,
                    );
                    await MtvRoomsWsController.onLeave({
                        user,
                        leavingRoomID: currMtvRoomID,
                    });
                }

                const raw = await MtvRoomsWsController.onCreate({
                    name: payload.name,
                    userID: user.uuid,
                    initialTracksIDs: payload.initialTracksIDs,
                    deviceID,
                });
                Ws.io
                    .to(raw.workflowID)
                    .emit('CREATE_ROOM_SYNCHED_CALLBACK', raw.state);
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('GET_CONTEXT', async () => {
            try {
                const {
                    mtvRoomID,
                    user: { uuid: userID },
                } = await SocketLifecycle.getSocketConnectionCredentials(
                    socket,
                );
                if (mtvRoomID === undefined) {
                    throw new Error(
                        "GET_CONTEXT failed user doesn't have a mtvRoom",
                    );
                }

                const state = await MtvRoomsWsController.onGetState({
                    roomID: mtvRoomID,
                    userID,
                });
                socket.emit('RETRIEVE_CONTEXT', state);
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('JOIN_ROOM', async ({ roomID }) => {
            try {
                if (!roomID) {
                    throw new Error('JOIN_ROOM failed roomID is empty');
                }

                const joiningRoom = await SocketLifecycle.doesRoomExist(roomID);
                if (joiningRoom === null) {
                    throw new Error(
                        `Join failed given roomID does not match with any room ${roomID}`,
                    );
                }

                const {
                    user,
                    deviceID,
                    mtvRoomID: currMtvRoomID,
                } = await SocketLifecycle.getSocketConnectionCredentials(
                    socket,
                );

                console.log(`JOIN SIGNAL RECEIVE FOR USER ${user.uuid}`);
                /**
                 * Checking if user needs to leave previous
                 * mtv room before joining new one
                 */
                if (currMtvRoomID !== undefined) {
                    console.log(
                        `User needs to leave current room before joining new one`,
                    );
                    await MtvRoomsWsController.onLeave({
                        user,
                        leavingRoomID: currMtvRoomID,
                    });
                }

                await MtvRoomsWsController.onJoin({
                    joiningRoom,
                    userID: user.uuid,
                    deviceID,
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('LEAVE_ROOM', async () => {
            try {
                const { user, mtvRoomID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );

                /**
                 * Remark: no need to verify if room exists such as for the join event
                 * As when a room get evicted it will remove the foreignKey in the user model
                 * Then if mtvRoomID is defined in the User model it means the room is listed
                 * in base
                 */
                if (mtvRoomID === undefined) {
                    throw new Error(
                        `Leave fails user is not related to any mtv room ${user.uuid}`,
                    );
                }

                await MtvRoomsWsController.onLeave({
                    user,
                    leavingRoomID: mtvRoomID,
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('ACTION_PLAY', async () => {
            try {
                //we need to check auth from socket id into a userId into a room users[]
                const { mtvRoomID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );
                if (mtvRoomID === undefined) {
                    throw new Error('ACTION_PLAY failed room not found');
                }
                await MtvRoomsWsController.onPlay({
                    roomID: mtvRoomID,
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('ACTION_PAUSE', async () => {
            try {
                const { mtvRoomID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );
                if (mtvRoomID === undefined) {
                    throw new Error('ACTION_PLAY failed room not found');
                }
                await MtvRoomsWsController.onPause({
                    roomID: mtvRoomID,
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('GO_TO_NEXT_TRACK', async () => {
            try {
                const { mtvRoomID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );

                if (mtvRoomID === undefined) {
                    throw new Error(
                        'Can not go to the next track, the user is not listening to a mtv room',
                    );
                }

                await MtvRoomsWsController.onGoToNextTrack({
                    roomID: mtvRoomID,
                });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('CHANGE_EMITTING_DEVICE', async ({ newEmittingDeviceID }) => {
            try {
                console.log('RECEIVED CHANGE EMITTING DEVICE FORM CLIENT');
                const {
                    user: { uuid: userID },
                    mtvRoomID,
                } = await SocketLifecycle.getSocketConnectionCredentials(
                    socket,
                );

                if (!mtvRoomID) {
                    throw new Error(
                        'Error on CHANGE_EMITTING_DEVICE cannot change emitting device if user is not in a mtvRoom',
                    );
                }

                const newEmittingDevice = await Device.findOrFail(
                    newEmittingDeviceID,
                );

                await newEmittingDevice.load('user');
                if (!newEmittingDevice.user) {
                    throw new Error(
                        'newEmittingDevice.user should not be empty',
                    );
                }

                const userIsNotTheNewDeviceOwner =
                    newEmittingDevice.user.uuid !== userID;

                if (userIsNotTheNewDeviceOwner) {
                    throw new Error(
                        `device: ${newEmittingDeviceID} does not belongs to userID: ${userID}`,
                    );
                }
                console.log(
                    'RECEIVED CHANGE EMITTING DEVICE FORM CLIENT EVERYTHING IS OK',
                );

                await MtvRoomsWsController.onChangeEmittingDevice({
                    deviceID: newEmittingDeviceID,
                    roomID: mtvRoomID,
                    userID: userID,
                });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('SUGGEST_TRACKS', async ({ tracksToSuggest }) => {
            try {
                const {
                    mtvRoomID,
                    user: { uuid: userID },
                    deviceID,
                } = await SocketLifecycle.getSocketConnectionCredentials(
                    socket,
                );
                if (mtvRoomID === undefined) {
                    throw new Error(
                        'Can not suggest tracks, the user is not listening to a mtv room',
                    );
                }

                await MtvRoomsWsController.onTracksSuggestion({
                    roomID: mtvRoomID,
                    tracksToSuggest,
                    userID,
                    deviceID,
                });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('VOTE_FOR_TRACK', async ({ trackID }) => {
            try {
                if (!trackID) {
                    throw new Error('payload is invalid');
                }

                const {
                    mtvRoomID,
                    user: { uuid: userID },
                } = await SocketLifecycle.getSocketConnectionCredentials(
                    socket,
                );

                if (mtvRoomID === undefined) {
                    throw new Error(
                        'VOTE_FOR_TRACK user is not related to any room',
                    );
                }

                await MtvRoomsWsController.voteForTrack({
                    roomID: mtvRoomID,
                    trackID,
                    userID,
                });
            } catch (e) {
                console.error(e);
            }
        });

        /// //// ///

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
        console.error(e);
    }
});
