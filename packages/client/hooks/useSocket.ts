import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { io, Socket } from '../services/websockets';

export type SocketClient = Socket<
    AllServerToClientEvents,
    AllClientToServerEvents
>;

export function useSocket(): SocketClient {
    const socket: SocketClient = useMemo(
        () =>
            io(SERVER_ENDPOINT, {
                query: {
                    userID: getFakeUserID(),
                },
            }),
        [],
    );

    return socket;
}

function getFakeUserID(): string {
    return Platform.OS === 'web'
        ? 'f5ddbf01-cc01-4422-b347-67988342b558'
        : '9ed60e96-d5fc-40b3-b842-aeaa75e93972';
}
