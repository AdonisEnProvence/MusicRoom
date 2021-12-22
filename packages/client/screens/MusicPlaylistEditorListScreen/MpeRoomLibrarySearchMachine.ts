import { MtvRoomSummary } from '@musicroom/types';
import { createModel } from 'xstate/lib/model';
import { getFakeUserID } from '../../contexts/SocketContext';
import { appScreenHeaderWithSearchBarMachine } from '../../machines/appScreenHeaderWithSearchBarMachine';
import { fetchLibraryMpeRooms } from '../../services/MpeService';

const libraryMpeRoomsModel = createModel(
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

const assignSearchQueryToContext = libraryMpeRoomsModel.assign(
    {
        searchQuery: (_, event) => event.searchQuery,
    },
    'SUBMITTED',
);

const assignFetchedRoomsToContext = libraryMpeRoomsModel.assign(
    {
        rooms: (context, event) => event.rooms,
    },
    'FETCHED_ROOMS',
);

export const libraryMpeRoomsSearchMachine = libraryMpeRoomsModel.createMachine(
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

                        actions: libraryMpeRoomsModel.assign({
                            searchQuery: '',
                        }),
                    },

                    CANCEL: {
                        target: 'steps.fetchingRooms',

                        actions: libraryMpeRoomsModel.assign({
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
            fetchRooms: () => async (sendBack) => {
                try {
                    //This is temporary
                    //Later we will use the session cookie as auth
                    const userID = getFakeUserID();
                    const fetchedRoomResponse = await fetchLibraryMpeRooms({
                        userID,
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
