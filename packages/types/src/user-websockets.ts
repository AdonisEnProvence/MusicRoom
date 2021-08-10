export type UserDevice = {
    deviceID: string;
    name: string;
};

export interface UserClientToServerEvents {
    GET_CONNECTED_DEVICES: (
        cb: (payload: { devices: UserDevice[] }) => void,
    ) => void;
}

export interface UserServerToClientEvents {
    CONNECTED_DEVICES_UPDATE: (devices: UserDevice[]) => void;
}
