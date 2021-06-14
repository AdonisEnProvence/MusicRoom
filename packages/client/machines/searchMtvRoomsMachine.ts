import { assign, createMachine } from 'xstate';
import { listAllRooms } from '../services/MtvService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

type SearchMtvRoomsEvent =
    | { type: 'SUBMITTED' }
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

        // FIXME: replace by idle when we will have implemented
        // suggestions fetching
        initial: 'fetchingRooms',

        invoke: {
            id: 'searchBarMachine',
            src: appScreenHeaderWithSearchBarMachine,
        },

        states: {
            idle: {
                on: {
                    SUBMITTED: {
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
            fetchRooms: (_context, _event) => async (sendBack, _onReceive) => {
                // if (event.type !== 'SUBMITTED') {
                //     throw new Error(
                //         'fetchRooms service must be invoked in response to SUBMITTED event',
                //     );
                // }

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
