import { MtvRoomSummary } from '@musicroom/types';
import { createModel } from 'xstate/lib/model';
import { fetchMtvRooms } from '../services/MtvService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const searchMtvRoomsModel = createModel(
    {
        rooms: [] as MtvRoomSummary[],
        hasMore: true,

        nextPage: 1,
        searchQuery: '',
    },
    {
        events: {
            SUBMITTED: (searchQuery: string) => ({ searchQuery }),
            CLEAR_QUERY: () => ({}),
            CANCEL: () => ({}),

            FETCHED_ROOMS: (
                rooms: MtvRoomSummary[],
                hasMore: boolean,
                page: number,
            ) => ({ rooms, hasMore, page }),

            LOAD_MORE_ITEMS: () => ({}),

            FAILED_FETCHING_ROOMS: () => ({}),
        },
    },
);

const assignSearchQueryToContext = searchMtvRoomsModel.assign(
    {
        searchQuery: (_, event) => event.searchQuery,
        nextPage: 1,
    },
    'SUBMITTED',
);

const assignFetchedRoomsToContext = searchMtvRoomsModel.assign(
    {
        rooms: (
            { rooms: currentRooms },
            { rooms: fetchedRooms, page: fetchedPage },
        ) => {
            if (fetchedPage === 1) {
                return fetchedRooms;
            }

            return [...currentRooms, ...fetchedRooms];
        },
        hasMore: (_, { hasMore }) => hasMore,
        nextPage: ({ nextPage }, { hasMore }) =>
            hasMore === true ? nextPage + 1 : nextPage,
    },
    'FETCHED_ROOMS',
);

export const searchMtvRoomsMachine = searchMtvRoomsModel.createMachine(
    {
        type: 'parallel',

        states: {
            steps: {
                initial: 'fetchingRooms',

                states: {
                    idle: {
                        on: {
                            LOAD_MORE_ITEMS: {
                                cond: 'hasMoreRoomsToFetch',

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
                                target: 'idle',

                                actions: assignFetchedRoomsToContext,
                            },

                            FAILED_FETCHING_ROOMS: {
                                target: 'errFetchingRooms',
                            },
                        },
                    },

                    errFetchingRooms: {},
                },

                on: {
                    SUBMITTED: {
                        cond: (
                            { searchQuery: currentSearchQuery },
                            { searchQuery: updatedSearchQuery },
                        ) => {
                            const isSameSearchQuery =
                                currentSearchQuery === updatedSearchQuery;
                            const isDifferentSearchQuery =
                                isSameSearchQuery === false;

                            return isDifferentSearchQuery;
                        },

                        target: 'steps.fetchingRooms',

                        actions: assignSearchQueryToContext,
                    },

                    CLEAR_QUERY: {
                        target: 'steps.fetchingRooms',

                        actions: searchMtvRoomsModel.assign({
                            searchQuery: '',
                            nextPage: 1,
                        }),
                    },

                    CANCEL: {
                        target: 'steps.fetchingRooms',

                        actions: searchMtvRoomsModel.assign({
                            searchQuery: '',
                            nextPage: 1,
                        }),
                    },
                },
            },

            searchBar: {
                invoke: {
                    id: 'searchBarMachine',
                    src: appScreenHeaderWithSearchBarMachine,
                },
            },
        },
    },
    {
        services: {
            fetchRooms:
                ({ nextPage, searchQuery }) =>
                async (sendBack) => {
                    try {
                        const fetchedRoomResponse = await fetchMtvRooms({
                            page: nextPage,
                            searchQuery,
                        });

                        sendBack({
                            type: 'FETCHED_ROOMS',
                            rooms: fetchedRoomResponse.data,
                            hasMore: fetchedRoomResponse.hasMore,
                            page: fetchedRoomResponse.page,
                        });
                    } catch (err) {
                        console.error(err);

                        sendBack({
                            type: 'FAILED_FETCHING_ROOMS',
                        });
                    }
                },
        },

        guards: {
            hasMoreRoomsToFetch: ({ hasMore }) => hasMore === true,
        },
    },
);
