import { AllServerToClientEvents, UserDevice } from '@musicroom/types';
import Device from 'App/Models/Device';
import User from 'App/Models/User';
import SocketLifecycle from './SocketLifecycle';
import Ws from './Ws';

export default class UserService {
    public static async joinEveryUserDevicesToRoom(
        user: User,
        roomID: string,
    ): Promise<void> {
        await user.load('devices');
        const devicesAttempts = await Promise.all(
            user.devices.map(async (device) => {
                try {
                    console.log('remote join device ', device.socketID);
                    await Ws.adapter().remoteJoin(device.socketID, roomID);
                    return device.socketID;
                } catch (e) {
                    console.error(e);
                    return undefined;
                }
            }),
        );
        const couldntJoinAtLeastOneDevice = devicesAttempts.every(
            (el) => el === undefined,
        );

        if (couldntJoinAtLeastOneDevice) {
            throw new Error(
                `couldn't join for any device for user ${user.uuid}`,
            );
        }
    }

    /**
     * This function will disconnect user's found devices from
     * the given roomID socket io room instance
     * @param user User's devices to disconnect
     * @param roomID roomID to leave
     */
    public static async leaveEveryUserDevicesFromRoom(
        user: User,
        roomID: string,
    ): Promise<void> {
        const connectedSocketsToRoom =
            await SocketLifecycle.getConnectedSocketToRoom(roomID);

        await user.load('devices');
        await Promise.all(
            user.devices.map(async (device) => {
                try {
                    if (connectedSocketsToRoom.has(device.uuid)) {
                        console.log('remote leave device ', device.socketID);
                        await Ws.adapter().remoteLeave(device.socketID, roomID);
                    }
                } catch (e) {
                    console.error(e);
                }
            }),
        );
    }

    public static async emitConnectedDevicesUpdateToEveryUserDevices(
        userID: string,
    ): Promise<void> {
        const devices = await this.getUserConnectedDevices(userID);
        const formattedDevices: UserDevice[] = devices.map((device) => ({
            deviceID: device.uuid,
            name: device.name,
        }));

        await this.emitEventInEveryDeviceUser(
            userID,
            'CONNECTED_DEVICES_UPDATE',
            [formattedDevices],
        );
    }

    public static async emitEventInEveryDeviceUser<
        Event extends keyof AllServerToClientEvents,
        Args extends Parameters<AllServerToClientEvents[Event]>,
    >(userID: string, event: Event, args: Args): Promise<void> {
        const user = await User.findOrFail(userID);
        await user.load('devices');
        if (!user.devices) return;

        user.devices.forEach((device) =>
            this.emitEventInSocket(device.socketID, event, args),
        );
    }

    public static emitEventInSocket<
        Event extends keyof AllServerToClientEvents,
        Args extends Parameters<AllServerToClientEvents[Event]>,
    >(socketID: string, event: Event, args: Args): void {
        Ws.io.to(socketID).emit(event, ...args);
    }

    public static async getUserConnectedDevices(
        userID: string,
    ): Promise<Device[]> {
        const user = await User.findOrFail(userID);

        await user.load('devices');

        if (user.devices === null)
            throw new Error(`user should have at least one device connected`);

        return user.devices;
    }

    public static async getUserCurrentlyEmittingDevice(
        userID: string,
    ): Promise<Device | undefined> {
        const previouslyEmittingDevices = await Device.query()
            .where('user_id', userID)
            .where('is_emitting', true);

        if (previouslyEmittingDevices.length > 1) {
            throw new Error(
                `User emitting device is corrupted he has previously ${previouslyEmittingDevices.length} emitting devices ${userID}`,
            );
        } else if (previouslyEmittingDevices.length === 0) {
            console.log(
                'user might not be in mtvRoom or device could be deleted',
            );
            return undefined;
        }

        return previouslyEmittingDevices[0];
    }
}
