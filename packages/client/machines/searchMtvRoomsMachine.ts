import { createModel } from 'xstate/lib/model';
import { MtvRoomSearchResult } from '@musicroom/types';
import { fetchMtvRooms } from '../services/MtvService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const searchMtvRoomsModel = createModel(
    {
        rooms: [] as MtvRoomSearchResult[],
        hasMore: true,

        page: 1,
        searchQuery: '',
    },
    {
        events: {
            SUBMITTED: (searchQuery: string) => ({ searchQuery }),

            FETCHED_ROOMS: (
                rooms: MtvRoomSearchResult[],
                hasMore: boolean,
            ) => ({ rooms, hasMore }),

            FAILED_FETCHING_ROOMS: () => ({}),
        },
    },
);

const assigSearchQueryToContext = searchMtvRoomsModel.assign(
    {
        searchQuery: (_, event) => event.searchQuery,
    },
    'SUBMITTED',
);

const assignFetchedRoomsToContext = searchMtvRoomsModel.assign(
    {
        rooms: (_, event) => event.rooms,
        hasMore: (_, event) => event.hasMore,
    },
    'FETCHED_ROOMS',
);

export const searchMtvRoomsMachine = searchMtvRoomsModel.createMachine(
    {
        context: searchMtvRoomsModel.initialContext,

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

                        actions: assigSearchQueryToContext,
                    },
                },
            },

            fetchingRooms: {
                invoke: {
                    src: 'fetchRooms',
                },

                on: {
                    FETCHED_ROOMS: {
                        target: 'idle',

                        actions: assignFetchedRoomsToContext,
                    },

                    FAILED_FETCHING_ROOMS: {
                        target: 'errFetchingRooms',
                    },
                },
            },

            errFetchingRooms: {
                on: {
                    SUBMITTED: {
                        target: 'fetchingRooms',
                    },
                },
            },
        },
    },
    {
        services: {
            fetchRooms:
                ({ page, searchQuery }) =>
                async (sendBack) => {
                    try {
                        const fetchedRoomResponse = await fetchMtvRooms({
                            page,
                            searchQuery,
                        });

                        sendBack({
                            type: 'FETCHED_ROOMS',
                            rooms: fetchedRoomResponse.data,
                            hasMore: fetchedRoomResponse.hasMore,
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
