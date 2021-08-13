export type UserDevice = {
    deviceID: string;
    name: string;
};

export interface UserClientToServerEvents {
    GET_CONNECTED_DEVICES_AND_DEVICE_ID: (
        cb: (payload: { devices: UserDevice[]; currDeviceID: string }) => void,
    ) => void;
}

export interface UserServerToClientEvents {
    CONNECTED_DEVICES_UPDATE: (devices: UserDevice[]) => void;
}
