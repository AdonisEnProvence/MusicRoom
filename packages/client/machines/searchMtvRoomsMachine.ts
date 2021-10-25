import { MtvRoomSummary } from '@musicroom/types';
import { createModel } from 'xstate/lib/model';
import { getFakeUserID } from '../contexts/SocketContext';
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

                        actions: assignSearchQueryToContext,
                    },

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
                ({ nextPage, searchQuery }) =>
                async (sendBack) => {
                    try {
                        //This is temporary
                        //Later we will use the session cookie as auth
                        const userID = getFakeUserID();
                        const fetchedRoomResponse = await fetchMtvRooms({
                            page: nextPage,
                            searchQuery,
                            userID,
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
