import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import { Socket } from 'socket.io-client';

let EVENTS: Record<string, ((...args: any) => void)[]> = {} as any;

const socket = {
    on<ServerToClientEvent extends keyof AllServerToClientEvents>(
        event: ServerToClientEvent,
        cb: (
            ...args: Parameters<AllServerToClientEvents[ServerToClientEvent]>
        ) => void,
    ): void {
        if (EVENTS[event]) {
            EVENTS[event].push(cb);
            return;
        }
        EVENTS[event] = [cb];
    },
    emit(): void {
        return undefined;
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
    emit<Event extends keyof AllClientToServerEvents>(
        event: Event,
        ...args: Parameters<AllClientToServerEvents[Event]>
    ): void {
        const handlers = EVENTS[event];
        if (handlers === undefined) {
            return;
        }

        EVENTS[event].forEach((func) => {
            func(...args);
        });
    },
};

export function cleanup(): void {
    EVENTS = {};
}

export default io;
