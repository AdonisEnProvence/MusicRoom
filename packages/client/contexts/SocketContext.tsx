import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import * as Device from 'expo-device';
import React, { useContext, useMemo } from 'react';
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
    if (typeof window !== 'undefined' && 'localStorage' in window) {
        const userIDFromLocalStorage = window.localStorage.getItem('USER_ID');
        if (typeof userIDFromLocalStorage === 'string') {
            return userIDFromLocalStorage;
        }
    }

    return Platform.OS === 'web'
        ? 'f5ddbf01-cc01-4422-b347-67988342b558'
        : '9ed60e96-d5fc-40b3-b842-aeaa75e93972';
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
