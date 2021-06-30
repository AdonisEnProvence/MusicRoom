import Event from '@ioc:Adonis/Core/Event';
import ChatController from 'App/Controllers/Ws/ChatController';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import Ws from 'App/Services/Ws';
import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '../../types/dist';

Ws.boot();

async function getSocketConnectionCredentials(
    socket: Socket<
        AllClientToServerEvents,
        AllServerToClientEvents,
        DefaultEventsMap
    >,
): Promise<{ mtvRoomID?: string; userID: string }> {
    const device = await Device.findByOrFail('socket_id', socket.id);
    await device.load('user');
    if (device.user === null) {
        throw new Error(
            `Device should always have a user relationship deviceID = ${device.uuid}`,
        );
    }
    const userID = device.user.uuid;
    await device.user.load('mtvRoom');
    let mtvRoomID: string | undefined;
    if (device.user.mtvRoom !== null) {
        mtvRoomID = device.user.mtvRoom.uuid;
        const socketConnectionsToRoomID = await Ws.adapter().sockets(
            new Set([mtvRoomID]),
        );
        console.log({ socketConnectionsToRoomID, socketID: socket.id });
        if (!socketConnectionsToRoomID.has(socket.id)) {
            throw new Error(
                'Device should appears in the socket io room too, synchro error',
            );
        }
    }
    return {
        userID,
        mtvRoomID,
    };
}

Event.on('db:query', function ({ sql, bindings }) {
    console.log(sql, bindings);
});

Ws.io.on('connection', async (socket) => {
    try {
        ChatController.onConnect({ socket, payload: undefined });

        const queryUserID = socket.handshake.query['userID'];

        const hasDeviceNotBeenFound =
            (await Device.findBy('socket_id', socket.id)) === null;
        if (hasDeviceNotBeenFound) {
            console.log(`registering a device for user ${queryUserID}`);
            if (!queryUserID || typeof queryUserID !== 'string') {
                throw new Error('Empty or invalid user token');
            }
            const userAgent = socket.request.headers['user-agent'];
            const deviceOwner = await User.findOrFail(queryUserID);
            const newDevice = await Device.create({
                socketID: socket.id,
                userID: queryUserID,
                userAgent,
            });
            await newDevice.related('user').associate(deviceOwner);
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
                console.log('_'.repeat(10));
                console.log('loosing connection on socket :', socket.id);
                const device = await Device.findByOrFail(
                    'socket_id',
                    socket.id,
                );
                /**
                 *  Manage owned MTVRoom max 1 per user
                 */
                const room = await MtvRoom.findBy('creator', device.userID);
                const allUserDevices = await Device.query().where(
                    'user_id',
                    device.userID,
                );
                console.log(
                    `User ${
                        room ? 'owns a room' : 'do not own a room'
                    } and has ${allUserDevices.length} connected`,
                );

                /**
                 *  Kill the room if the creator doesn't have any other session alive on other device
                 *  All sessions room's connections are synchronized, if device is in pg the room connection is alive
                 */
                const hasNoMoreDevice = allUserDevices.length <= 1;
                if (room !== null && hasNoMoreDevice) {
                    const adapter = Ws.adapter();
                    const connectedSockets = await adapter.sockets(
                        new Set([room.uuid]),
                    );
                    console.log({ connectedSockets });
                    await MtvRoomsWsController.onTerminate(room.uuid);
                    Ws.io.in(room.uuid).emit('FORCED_DISCONNECTION');
                    connectedSockets.forEach((socketID) =>
                        adapter.remoteLeave(socketID, room.uuid),
                    );
                }

                /**
                 *  Remove device from pg
                 */
                await device.delete();
                console.log('='.repeat(10));
            } catch (e) {
                console.error('Error on socket.on(disconection)', e);
            }
        });
    } catch (e) {
        console.error(e);
    }

    /// //// ///
});
