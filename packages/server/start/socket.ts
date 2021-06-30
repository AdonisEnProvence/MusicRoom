import ChatController from 'App/Controllers/Ws/ChatController';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import Ws from 'App/Services/Ws';

Ws.boot();

//TODO SECURE ROOM CALL
// const roomAuth = (socketID: string, roomID: string | undefined) => {
//     if (!roomID) {
//         console.error('ROOMID REQUIRED 404');
//         return false;
//     }
//     if (!Ws.io.sockets.adapter.rooms[roomID].sockets[socketID]) {
//         console.error('UNAUTH 403');
//         return false;
//     }
//     return true;
// };

Ws.io.on('connection', async (socket) => {
    try {
        ChatController.onConnect({ socket, payload: undefined });

        const userID = socket.handshake.query['userID'];
        console.log({ userID });

        const hasDeviceNotBeenFound =
            (await Device.findBy('socket_id', socket.id)) === null;
        if (hasDeviceNotBeenFound) {
            console.log(`registering a device for user ${userID}`);
            if (!userID || typeof userID !== 'string') {
                throw new Error('Empty or invalid user token');
            }
            const userAgent = socket.request.headers['user-agent'];
            const deviceOwner = await User.findOrFail(userID);
            const newDevice = await Device.create({
                socketID: socket.id,
                userID,
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
                const { workflowID, state } =
                    await MtvRoomsWsController.onCreate({
                        socket,
                        payload,
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
                await MtvRoomsWsController.onJoin({ socket, payload });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('ACTION_PLAY', async (payload) => {
            try {
                //we need to check auth from socket id into a userId into a room users[]
                await MtvRoomsWsController.onPlay({ socket, payload });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('ACTION_PAUSE', async (payload) => {
            try {
                await MtvRoomsWsController.onPause({ socket, payload });
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
                    const payload = {
                        roomID: room.uuid,
                    };
                    await MtvRoomsWsController.onTerminate({
                        socket,
                        payload,
                    });
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
