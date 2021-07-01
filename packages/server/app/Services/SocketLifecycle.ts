import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import { TypedSocket } from 'start/socket';
import Ws from './Ws';

export default class SocketLifecycle {
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
        console.log(await MtvRoom.all());
        const room = await MtvRoom.findBy('creator', device.userID);
        if (room)
            console.log(
                'Genre avant ???',
                await Ws.adapter().sockets(new Set([room.uuid])),
            );
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
}
