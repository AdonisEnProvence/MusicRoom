import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import * as Device from 'expo-device';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { io, Socket } from '../services/websockets';

export type SocketClient = Socket<
    AllServerToClientEvents,
    AllClientToServerEvents
>;

interface IoConnectionQuery {
    [key: string]: string;
}

export function useSocket(): SocketClient {
    const socket: SocketClient = useMemo(() => {
        const deviceName = Device.deviceName;
        const query: IoConnectionQuery = {
            userID: getFakeUserID(),
        };
        if (deviceName !== null) {
            query.deviceName = deviceName;
        }

        return io(SERVER_ENDPOINT, {
            query,
        });
    }, []);

    return socket;
}

function getFakeUserID(): string {
    return Platform.OS === 'web'
        ? 'f5ddbf01-cc01-4422-b347-67988342b558'
        : '9ed60e96-d5fc-40b3-b842-aeaa75e93972';
}
