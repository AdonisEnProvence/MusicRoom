import { AllClientToServerEvents } from '@musicroom/types';

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
    emit<Event extends keyof AllClientToServerEvents>(
        event: Event,
        ...args: Parameters<AllClientToServerEvents[Event]>
    ): void {
        return undefined;
    },
};
export type ServerSocket = typeof serverSocket;
