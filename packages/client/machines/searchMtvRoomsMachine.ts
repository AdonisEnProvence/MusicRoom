import { assign, createMachine } from 'xstate';
import { listAllRooms } from '../services/MtvService';

type SearchMtvRoomsEvent =
    | { type: 'SEND_REQUEST' }
    | { type: 'FETCHED_ROOMS'; rooms: string[] }
    | { type: 'FAILED_FETCHING_ROOMS' };

interface SearchMtvRoomContext {
    rooms: undefined | string[];
}

export const searchMtvRoomsMachine = createMachine<
    SearchMtvRoomContext,
    SearchMtvRoomsEvent
>(
    {
        context: {
            rooms: undefined,
        },

        initial: 'idle',

        states: {
            idle: {
                on: {
                    SEND_REQUEST: {
                        target: 'fetchingRooms',
                    },
                },
            },

            fetchingRooms: {
                invoke: {
                    src: 'fetchRooms',
                },

                on: {
                    FETCHED_ROOMS: {
                        actions: 'assignRoomsToContext',
                        target: 'fetchedRooms',
                    },

                    FAILED_FETCHING_ROOMS: {
                        target: 'errFetchingRooms',
                    },
                },
            },

            fetchedRooms: {},

            errFetchingRooms: {},
        },
    },
    {
        actions: {
            assignRoomsToContext: assign((context, event) => {
                if (event.type !== 'FETCHED_ROOMS') {
                    return context;
                }

                return {
                    ...context,
                    rooms: event.rooms,
                };
            }),
        },

        services: {
            fetchRooms: (_context, event) => async (sendBack, _onReceive) => {
                if (event.type !== 'SEND_REQUEST') {
                    return;
                }

                try {
                    const rooms = await listAllRooms();
                    sendBack({
                        type: 'FETCHED_ROOMS',
                        rooms,
                    });
                } catch (err) {
                    console.error(err);
                    sendBack({
                        type: 'FAILED_FETCHING_ROOMS',
                    });
                }
            },
        },
    },
);
