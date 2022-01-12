import { MpeRoomSummary, MtvRoomSummary } from '@musicroom/types';
import { EventFrom, Sender } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { getFakeUserID } from '../contexts/SocketContext';
import { fetchAllMpeRooms, fetchLibraryMpeRooms } from '../services/MpeService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const mpeRoomUniversalSearchModel = createModel(
    {
        rooms: [] as MtvRoomSummary[],

        searchQuery: '',
    },
    {
        events: {
            SUBMITTED: (searchQuery: string) => ({ searchQuery }),
            CLEAR_QUERY: () => ({}),
            CANCEL: () => ({}),

            FETCHED_ROOMS: (rooms: MtvRoomSummary[]) => ({
                rooms,
            }),

            LOAD_MORE_ITEMS: () => ({}),

            FAILED_FETCHING_ROOMS: () => ({}),
        },
    },
);

const assignSearchQueryToContext = mpeRoomUniversalSearchModel.assign(
    {
        searchQuery: (_, event) => event.searchQuery,
    },
    'SUBMITTED',
);

const assignFetchedRoomsToContext = mpeRoomUniversalSearchModel.assign(
    {
        rooms: (context, event) => event.rooms,
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
    }) => Promise<MpeRoomSummary[]>;
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
                        idle: {},

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

                            actions: mpeRoomUniversalSearchModel.assign({
                                searchQuery: '',
                            }),
                        },

                        CANCEL: {
                            target: 'steps.fetchingRooms',

                            actions: mpeRoomUniversalSearchModel.assign({
                                searchQuery: '',
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
                    ({ searchQuery }) =>
                    async (
                        sendBack: Sender<
                            EventFrom<typeof mpeRoomUniversalSearchModel>
                        >,
                    ) => {
                        try {
                            //This is temporary
                            //Later we will use the session cookie as auth
                            const userID = getFakeUserID();
                            const fetchedRoomResponse = await fetchMpeRooms({
                                userID,
                                searchQuery,
                            });

                            sendBack({
                                type: 'FETCHED_ROOMS',
                                rooms: fetchedRoomResponse,
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
