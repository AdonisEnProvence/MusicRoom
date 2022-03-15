import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import * as Device from 'expo-device';
import React, { useContext, useMemo } from 'react';
import invariant from 'tiny-invariant';
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
        const query: IoConnectionQuery = {};
        if (deviceName !== null) {
            query.deviceName = deviceName;
        }

        return io(SERVER_ENDPOINT, {
            query,
            withCredentials: true,
            autoConnect: false,
        });
    }, []);

    return socket;
}

export function getFakeUserID(): string {
    const userID = window.localStorage.getItem('USER_ID');
    invariant(userID !== null, 'userID is null');
    return userID;
}

const SocketContext = React.createContext<SocketClient | undefined>(undefined);

export const SocketContextProvider: React.FC = ({ children }) => {
    const socket = useSocket();

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export function useSocketContext(): SocketClient {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error(
            'useSocketContext must be used within a UseSocketContextProvider',
        );
    }

    return context;
}
