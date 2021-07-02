import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import { TypedSocket } from 'start/socket';
import Ws from './Ws';

export default class SocketLifecycle {
    /**
     * Make the given socket joins the given mtvRoomID
     * @param socket socket to sync
     * @param mtvRoomID room whom to be sync with
     */
    private static async syncMtvRoomContext(
        socket: TypedSocket,
        mtvRoomID: string,
    ): Promise<void> {
        const adapter = Ws.adapter();
        await adapter.remoteJoin(socket.id, mtvRoomID);
        const mtvRoomContext = await MtvRoomsWsController.onGetState(mtvRoomID);
        socket.emit('RETRIEVE_CONTEXT', { context: mtvRoomContext });
    }

    /**
     * Register device from socket informations
     *  - query userID
     *  - userAgent
     * Then associates it to the creator userModel
     * @param socket Socket to match to a device
     */
    public static async registerDevice(socket: TypedSocket): Promise<void> {
        const queryUserID = socket.handshake.query['userID'];

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
        if (deviceOwner.mtvRoomID) {
            await this.syncMtvRoomContext(socket, deviceOwner.mtvRoomID);
        }
    }

    public static async checkForMtvRoomDeletion(
        socket: TypedSocket,
    ): Promise<void> {
        console.log('_'.repeat(10));
        const device = await Device.findByOrFail('socket_id', socket.id);
        console.log(
            `LOOSING CONNECTION SOCKETID=${socket.id} USER=${device.userID}`,
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
            `User ${room ? 'owns a room' : 'do not own a room'} and has ${
                allUserDevices.length
            } connected`,
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
            console.log('ABOUT TO EMIT', { connectedSockets }, socket.id);
            console.log(room.uuid);
            await MtvRoomsWsController.onTerminate(room.uuid);
            console.log('ABOUT TO EMIT');
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
    }

    public static async getSocketConnectionCredentials(
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
}
