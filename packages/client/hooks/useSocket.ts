import {
    ChatClientToServerEvents,
    ChatServerToClientEvents,
} from '@musicroom/types';
import { useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export function useSocket(): Socket {
    const socket: Socket<ChatServerToClientEvents, ChatClientToServerEvents> =
        useMemo(() => io(SERVER_ENDPOINT), []);

    return socket;
}
