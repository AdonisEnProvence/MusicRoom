import {
    PaginatedUserSummariesSearchResult,
    UserSummary,
} from '@musicroom/types';
import { EventFrom, Sender } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { getFakeUserID } from '../contexts/SocketContext';
import {
    fetchMyFollowers,
    fetchMyFollowing,
    fetchUserFollowers,
    fetchUserFollowing,
} from '../services/UsersSearchService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

//TODO USE SEARCH MACHINE
const usersUniversalSearchModel = createModel(
    {
        usersSummaries: [] as UserSummary[],
        hasMore: true,
        nextPage: 1,
        searchQuery: '',
    },
    {
        events: {
            SUBMITTED: (searchQuery: string) => ({ searchQuery }),
            CLEAR_QUERY: () => ({}),
            CANCEL: () => ({}),

            FETCHED_USERS: (args: {
                usersSummaries: UserSummary[];
                hasMore: boolean;
                page: number;
            }) => args,

            LOAD_MORE_ITEMS: () => ({}),
            REFRESH: () => ({}),

            FAILED_FETCHING_USERS: () => ({}),
        },
    },
);

const assignSearchQueryToContext = usersUniversalSearchModel.assign(
    {
        searchQuery: (_, event) => event.searchQuery,
        nextPage: 1,
    },
    'SUBMITTED',
);

const assignFetchedUsersToContext = usersUniversalSearchModel.assign(
    {
        usersSummaries: (
            { usersSummaries: currentUsersSummaries },
            { usersSummaries: fetchedusersSummaries, page: fetchedPage },
        ) => {
            if (fetchedPage === 1) {
                return fetchedusersSummaries;
            }

            return [...currentUsersSummaries, ...fetchedusersSummaries];
        },
        hasMore: (_, { hasMore }) => hasMore,
        nextPage: ({ nextPage }, { hasMore }) =>
            hasMore === true ? nextPage + 1 : nextPage,
    },
    'FETCHED_USERS',
);

type UsersUniversalSearchMachine = ReturnType<
    typeof usersUniversalSearchModel['createMachine']
>;

export interface CreateUsersUniversalSearchMachineArgs {
    fetchUsers: (args: {
        userID: string;
        searchQuery: string;
        page: number;
        tmpAuthUserID: string;
    }) => Promise<PaginatedUserSummariesSearchResult>;
}

export function createUsersUniversalSearchMachine(): UsersUniversalSearchMachine {
    return usersUniversalSearchModel.createMachine(
        {
            type: 'parallel',

            states: {
                steps: {
                    initial: 'fetchingUsers',

                    states: {
                        idle: {
                            on: {
                                LOAD_MORE_ITEMS: {
                                    cond: 'hasMoreUsersToFetch',
                                    target: 'fetchingUsers',
                                },
                            },
                        },

                        fetchingUsers: {
                            tags: 'fetching',

                            invoke: {
                                src: 'fetchUsers',
                            },

                            on: {
                                FETCHED_USERS: {
                                    target: 'idle',

                                    actions: assignFetchedUsersToContext,
                                },

                                FAILED_FETCHING_USERS: {
                                    target: 'errFetchingUsers',
                                },
                            },
                        },

                        errFetchingUsers: {
                            tags: 'errorFetchingUsers',
                        },
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

                            target: 'steps.fetchingUsers',

                            actions: assignSearchQueryToContext,
                        },

                        CLEAR_QUERY: {
                            target: 'steps.fetchingUsers',

                            actions: usersUniversalSearchModel.assign({
                                searchQuery: '',
                                nextPage: 1,
                            }),
                        },

                        CANCEL: {
                            target: 'steps.fetchingUsers',

                            actions: usersUniversalSearchModel.assign({
                                searchQuery: '',
                                nextPage: 1,
                            }),
                        },

                        REFRESH: {
                            target: 'steps.fetchingUsers',

                            actions: usersUniversalSearchModel.assign({
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
                hasMoreUsersToFetch: ({ hasMore }) => hasMore === true,
            },
        },
    );
}

export const myFollowerSearchMachine =
    createUsersUniversalSearchMachine().withConfig({
        services: {
            fetchUsers:
                ({ searchQuery, nextPage }) =>
                async (
                    sendBack: Sender<
                        EventFrom<typeof usersUniversalSearchModel>
                    >,
                ) => {
                    try {
                        const { data, page, hasMore } = await fetchMyFollowers({
                            searchQuery,
                            page: nextPage,
                        });

                        sendBack({
                            type: 'FETCHED_USERS',
                            usersSummaries: data,
                            page,
                            hasMore,
                        });
                    } catch (err) {
                        console.error(err);

                        sendBack({
                            type: 'FAILED_FETCHING_USERS',
                        });
                    }
                },
        },
    });

export const myFollowingSearchMachine =
    createUsersUniversalSearchMachine().withConfig({
        services: {
            fetchUsers:
                ({ searchQuery, nextPage }) =>
                async (
                    sendBack: Sender<
                        EventFrom<typeof usersUniversalSearchModel>
                    >,
                ) => {
                    try {
                        const { data, page, hasMore } = await fetchMyFollowing({
                            searchQuery,
                            page: nextPage,
                        });

                        sendBack({
                            type: 'FETCHED_USERS',
                            usersSummaries: data,
                            page,
                            hasMore,
                        });
                    } catch (err) {
                        console.error(err);

                        sendBack({
                            type: 'FAILED_FETCHING_USERS',
                        });
                    }
                },
        },
    });

export function createUserFollowersSearchMachine({
    userID,
}: {
    userID: string;
}): UsersUniversalSearchMachine {
    return createUsersUniversalSearchMachine().withConfig({
        services: {
            fetchUsers:
                ({ searchQuery, nextPage }) =>
                async (
                    sendBack: Sender<
                        EventFrom<typeof usersUniversalSearchModel>
                    >,
                ) => {
                    try {
                        //This is temporary
                        //Later we will use the session cookie as auth
                        const tmpAuthUserID = getFakeUserID();
                        const { data, page, hasMore } =
                            await fetchUserFollowers({
                                searchQuery,
                                tmpAuthUserID,
                                page: nextPage,
                                userID,
                            });

                        sendBack({
                            type: 'FETCHED_USERS',
                            usersSummaries: data,
                            page,
                            hasMore,
                        });
                    } catch (err) {
                        sendBack({
                            type: 'FAILED_FETCHING_USERS',
                        });
                    }
                },
        },
    });
}

export function createUserFollowingSearchMachine({
    userID,
}: {
    userID: string;
}): UsersUniversalSearchMachine {
    return createUsersUniversalSearchMachine().withConfig({
        services: {
            fetchUsers:
                ({ searchQuery, nextPage }) =>
                async (
                    sendBack: Sender<
                        EventFrom<typeof usersUniversalSearchModel>
                    >,
                ) => {
                    try {
                        //This is temporary
                        //Later we will use the session cookie as auth
                        const tmpAuthUserID = getFakeUserID();
                        const { data, page, hasMore } =
                            await fetchUserFollowing({
                                searchQuery,
                                tmpAuthUserID,
                                page: nextPage,
                                userID,
                            });

                        sendBack({
                            type: 'FETCHED_USERS',
                            usersSummaries: data,
                            page,
                            hasMore,
                        });
                    } catch (err) {
                        console.error(err);

                        sendBack({
                            type: 'FAILED_FETCHING_USERS',
                        });
                    }
                },
        },
    });
}
