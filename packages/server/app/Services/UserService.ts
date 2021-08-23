import { AllServerToClientEvents, UserDevice } from '@musicroom/types';
import Device from 'App/Models/Device';
import User from 'App/Models/User';
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
                    console.log('connecting device ', device.socketID);
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

        if (couldntJoinAtLeastOneDevice)
            throw new Error(
                `couldn't join for any device for user ${user.uuid}`,
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
}
