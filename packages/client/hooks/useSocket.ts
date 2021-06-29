import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import { useMemo } from 'react';
import { getFakeUserID } from '../App';
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
