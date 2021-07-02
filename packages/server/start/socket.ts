import ChatController from 'App/Controllers/Ws/ChatController';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import Ws from 'App/Services/Ws';
import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '../../types/dist';

Ws.boot();

export type TypedSocket = Socket<
    AllClientToServerEvents,
    AllServerToClientEvents,
    DefaultEventsMap
>;

async function getSocketConnectionCredentials(
    socket: TypedSocket,
): Promise<{ mtvRoomID?: string; userID: string }> {
    const device = await Device.findByOrFail('socket_id', socket.id);
    await device.load('user');
    if (device.user === null) {
        throw new Error(
            `Device should always have a user relationship deviceID = ${device.uuid}`,
        );
    }
    const userID = device.user.uuid;
    const mtvRoomID = device.user.mtvRoomID ?? undefined;

    /**
     * Implicit socket io instance auth
     * If a user has a mtvRoomID, socket connection going through this function
     * should be found in the room's connectedSockets
     */
    if (mtvRoomID !== undefined) {
        const connectedSocketsInRoomID = await Ws.adapter().sockets(
            new Set([mtvRoomID]),
        );
        if (!connectedSocketsInRoomID.has(socket.id)) {
            throw new Error(
                'Device should appears in the socket io room too, sync error',
            );
        }
    }

    return {
        userID,
        mtvRoomID,
    };
}

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

        /// ROOM ///
        socket.on('CREATE_ROOM', async (payload, callback) => {
            try {
                const { userID } = await getSocketConnectionCredentials(socket);
                if (!payload.name) {
                    throw new Error('CREATE_ROOM failed name should be empty');
                }
                const { workflowID, state } =
                    await MtvRoomsWsController.onCreate({
                        socket,
                        payload: {
                            name: payload.name,
                            userID,
                        },
                    });
                callback(workflowID, state.name);
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('GET_CONTEXT', async (cb) => {
            try {
                //TODO CHECK AUTH, socket id is in mtvRoom
                const { mtvRoomID } = await getSocketConnectionCredentials(
                    socket,
                );
                if (mtvRoomID === undefined) {
                    throw new Error(
                        "GET_CONTEXT failed user doesn't have a mtvRoom",
                    );
                }
                cb({
                    context: await MtvRoomsWsController.onGetState(mtvRoomID),
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('JOIN_ROOM', async (args) => {
            try {
                if (!args.roomID) {
                    throw new Error('JOIN_ROOM failed roomID is empty');
                }
                const { userID } = await getSocketConnectionCredentials(socket);
                await getSocketConnectionCredentials(socket);
                await MtvRoomsWsController.onJoin({
                    socket,
                    payload: {
                        roomID: args.roomID,
                        userID,
                    },
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('ACTION_PLAY', async () => {
            try {
                //we need to check auth from socket id into a userId into a room users[]
                const { mtvRoomID } = await getSocketConnectionCredentials(
                    socket,
                );
                if (mtvRoomID === undefined) {
                    throw new Error('ACTION_PLAY failed room not found');
                }
                await MtvRoomsWsController.onPlay({
                    socket,
                    payload: {
                        roomID: mtvRoomID,
                    },
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('ACTION_PAUSE', async () => {
            try {
                const { mtvRoomID } = await getSocketConnectionCredentials(
                    socket,
                );
                if (mtvRoomID === undefined) {
                    throw new Error('ACTION_PLAY failed room not found');
                }
                await MtvRoomsWsController.onPause({
                    socket,
                    payload: {
                        roomID: mtvRoomID,
                    },
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('disconnecting', async () => {
            try {
                await SocketLifecycle.checkForMtvRoomDeletion(socket);
            } catch (e) {
                console.error('Error on socket.on(disconnecting)', e);
            }
        });
    } catch (e) {
        console.error(e);
    }

    /// //// ///
});
