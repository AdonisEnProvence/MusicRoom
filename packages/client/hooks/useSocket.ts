import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import { useMemo } from 'react';
import { io, Socket } from '../services/websockets';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export type SocketClient = Socket<
    AllServerToClientEvents,
    AllClientToServerEvents
>;

export function useSocket(): SocketClient {
    const socket: SocketClient = useMemo(() => io(SERVER_ENDPOINT), []);

    return socket;
}
