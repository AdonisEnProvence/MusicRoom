import { LatlngCoords } from '.';

export type UserDevice = {
    deviceID: string;
    name: string;
};

type UserUpdateDevicePositionArgs = LatlngCoords;

export interface UserClientToServerEvents {
    UPDATE_DEVICE_POSITION: (args: UserUpdateDevicePositionArgs) => void;
    GET_CONNECTED_DEVICES_AND_DEVICE_ID: (
        cb: (payload: { devices: UserDevice[]; currDeviceID: string }) => void,
    ) => void;
}

export interface UserServerToClientEvents {
    CONNECTED_DEVICES_UPDATE: (devices: UserDevice[]) => void;
}
