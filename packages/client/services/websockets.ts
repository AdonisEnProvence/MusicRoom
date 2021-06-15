import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';

export * from 'socket.io-client';

/**
 * ☢️ DO NOT USE OUTSIDE OF TESTS ☢️
 *
 * `serverSocket` must only be used in tests.
 * It will be mocked, as well as `socket.io-client`, and will permit to simulate
 * a bidirectional communication.
 * @private
 */
export const serverSocket = {
    emit<Event extends keyof AllServerToClientEvents>(
        event: Event,
        ...args: Parameters<AllServerToClientEvents[Event]>
    ): void {
        return undefined;
    },

    on<Event extends keyof AllClientToServerEvents>(
        event: Event,
        cb: (...args: Parameters<AllClientToServerEvents[Event]>) => void,
    ): void {
        return undefined;
    },
};
export type ServerSocket = typeof serverSocket;

/**
 * ☢️ DO NOT USE OUTSIDE OF TESTS ☢️
 *
 * This function is needed to clean in-memory event listeners in **TESTS**.
 */
export function cleanup(): void {
    return undefined;
}
