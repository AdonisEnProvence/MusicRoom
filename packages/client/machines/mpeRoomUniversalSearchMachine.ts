import { MpeRoomSummary, MtvRoomSummary } from '@musicroom/types';
import { EventFrom, Sender } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { getFakeUserID } from '../contexts/SocketContext';
import { fetchAllMpeRooms, fetchLibraryMpeRooms } from '../services/MpeService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const mpeRoomUniversalSearchModel = createModel(
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

            FETCHED_ROOMS: (args: {
                rooms: MtvRoomSummary[];
                hasMore: boolean;
                page: number;
            }) => args,

            LOAD_MORE_ITEMS: () => ({}),
            REFRESH: () => ({}),

            FAILED_FETCHING_ROOMS: () => ({}),
        },
    },
);

const assignSearchQueryToContext = mpeRoomUniversalSearchModel.assign(
    {
        searchQuery: (_, event) => event.searchQuery,
        nextPage: 1,
    },
    'SUBMITTED',
);

const assignFetchedRoomsToContext = mpeRoomUniversalSearchModel.assign(
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

type MpeRoomsUniversalSearchMachine = ReturnType<
    typeof mpeRoomUniversalSearchModel['createMachine']
>;

export interface CreateMpeRoomUniversalSearchMachine {
    fetchMpeRooms: (args: {
        userID: string;
        searchQuery: string;
        page: number;
    }) => Promise<{
        page: number;
        totalEntries: number;
        hasMore: boolean;
        data: MpeRoomSummary[];
    }>;
}

function createMpeRoomUniversalSearchMachine({
    fetchMpeRooms,
}: CreateMpeRoomUniversalSearchMachine): MpeRoomsUniversalSearchMachine {
    return mpeRoomUniversalSearchModel.createMachine(
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
                            tags: 'fetching',

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

                            actions: mpeRoomUniversalSearchModel.assign({
                                searchQuery: '',
                                nextPage: 1,
                            }),
                        },

                        CANCEL: {
                            target: 'steps.fetchingRooms',

                            actions: mpeRoomUniversalSearchModel.assign({
                                searchQuery: '',
                                nextPage: 1,
                            }),
                        },

                        REFRESH: {
                            target: 'steps.fetchingRooms',

                            actions: mpeRoomUniversalSearchModel.assign({
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
            guards: {
                hasMoreRoomsToFetch: ({ hasMore }) => hasMore === true,
            },

            services: {
                fetchRooms:
                    ({ searchQuery, nextPage }) =>
                    async (
                        sendBack: Sender<
                            EventFrom<typeof mpeRoomUniversalSearchModel>
                        >,
                    ) => {
                        try {
                            //This is temporary
                            //Later we will use the session cookie as auth
                            const userID = getFakeUserID();
                            const { data, page, hasMore } = await fetchMpeRooms(
                                {
                                    userID,
                                    searchQuery,
                                    page: nextPage,
                                },
                            );

                            sendBack({
                                type: 'FETCHED_ROOMS',
                                rooms: data,
                                page,
                                hasMore,
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
}

export const libraryMpeRoomSearchMachine = createMpeRoomUniversalSearchMachine({
    fetchMpeRooms: fetchLibraryMpeRooms,
});

export const mpeRoomSearchMachine = createMpeRoomUniversalSearchMachine({
    fetchMpeRooms: fetchAllMpeRooms,
});
