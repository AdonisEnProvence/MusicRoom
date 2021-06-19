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
                    userID: Platform.OS === 'web' ? 'web' : 'android',
                },
            }),
        [],
    );

    return socket;
}
