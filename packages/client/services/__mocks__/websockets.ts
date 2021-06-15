import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import { Socket } from 'socket.io-client';

let CLIENT_TO_SERVER_EVENTS: Record<string, ((...args: any) => void)[]> =
    {} as any;
let SERVER_TO_CLIENT_EVENTS: Record<string, ((...args: any) => void)[]> =
    {} as any;

const socket = {
    on<ServerToClientEvent extends keyof AllServerToClientEvents>(
        event: ServerToClientEvent,
        cb: (
            ...args: Parameters<AllServerToClientEvents[ServerToClientEvent]>
        ) => void,
    ): void {
        if (CLIENT_TO_SERVER_EVENTS[event]) {
            CLIENT_TO_SERVER_EVENTS[event].push(cb);
            return;
        }
        CLIENT_TO_SERVER_EVENTS[event] = [cb];
    },

    emit<Event extends keyof AllClientToServerEvents>(
        event: Event,
        ...args: Parameters<AllClientToServerEvents[Event]>
    ): void {
        console.log('emit from client to server');

        const handlers = SERVER_TO_CLIENT_EVENTS[event];
        if (handlers === undefined) {
            return;
        }

        SERVER_TO_CLIENT_EVENTS[event].forEach((func) => {
            func(...args);
        });
    },

    disconnect(): void {
        return undefined;
    },
};

export const io: () => Socket<
    AllServerToClientEvents,
    AllClientToServerEvents
> = () => socket as unknown as Socket;

export const serverSocket = {
    emit<Event extends keyof AllServerToClientEvents>(
        event: Event,
        ...args: Parameters<AllServerToClientEvents[Event]>
    ): void {
        const handlers = CLIENT_TO_SERVER_EVENTS[event];
        if (handlers === undefined) {
            return;
        }

        CLIENT_TO_SERVER_EVENTS[event].forEach((func) => {
            func(...args);
        });
    },

    on<ClientToServerEvent extends keyof AllClientToServerEvents>(
        event: ClientToServerEvent,
        cb: (
            ...args: Parameters<AllClientToServerEvents[ClientToServerEvent]>
        ) => void,
    ): void {
        if (SERVER_TO_CLIENT_EVENTS[event]) {
            SERVER_TO_CLIENT_EVENTS[event].push(cb);
            return;
        }
        SERVER_TO_CLIENT_EVENTS[event] = [cb];
    },
};

export function cleanup(): void {
    CLIENT_TO_SERVER_EVENTS = {};
    SERVER_TO_CLIENT_EVENTS = {};
}

export default io;
