import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import * as Device from 'expo-device';
import React, { useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

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
            'useUserContext must be used within a UserContextProvider',
        );
    }

    return context;
}
