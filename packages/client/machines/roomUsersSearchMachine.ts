import { UserSummary } from '@musicroom/types';
import { send } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { fetchMyFollowing, fetchUsers } from '../services/UsersSearchService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const roomUsersSearchModel = createModel(
    {
        usersToDisplay: [] as UserSummary[],

        bufferUsersFollowing: [] as UserSummary[],
        usersFollowing: [] as UserSummary[],
        usersFollowingPage: 1,
        hasMoreUsersFollowingToFetch: true,

        bufferFilteredUsers: [] as UserSummary[],
        filteredUsers: [] as UserSummary[],
        filteredUsersPage: 1,
        previousSearchQuery: '',
        searchQuery: '',
        hasMoreFilteredUsersToFetch: true,

        selectedUsers: [] as string[],
    },
    {
        events: {
            UPDATE_SEARCH_QUERY: (searchQuery: string) => ({ searchQuery }),
            CLEAR_QUERY: () => ({}),
            CANCEL: () => ({}),

            FETCHED_FOLLOWING: (
                following: UserSummary[],
                hasMore: boolean,
                page: number,
            ) => ({ following, hasMore, page }),

            FETCHED_USERS: (
                users: UserSummary[],
                hasMore: boolean,
                page: number,
            ) => ({ users, hasMore, page }),

            FETCH_MORE: () => ({}),

            DEBOUNCED_SEARCH: () => ({}),

            SELECT_USER: (userID: string) => ({ userID }),
        },
    },
);

const assignSearchQueryToContext = roomUsersSearchModel.assign(
    {
        searchQuery: (_, { searchQuery }) => searchQuery,
    },
    'UPDATE_SEARCH_QUERY',
);

const assignFirstFollowingToContext = roomUsersSearchModel.assign(
    {
        usersFollowing: ({ usersFollowing }, { following }) => [
            ...usersFollowing,
            ...following,
        ],
        usersFollowingPage: ({ usersFollowingPage }) => usersFollowingPage + 1,
        hasMoreUsersFollowingToFetch: (_, { hasMore }) => hasMore,
    },
    'FETCHED_FOLLOWING',
);

const assignFollowingToBufferOfContext = roomUsersSearchModel.assign(
    {
        bufferUsersFollowing: (_, { following }) => following,
        usersFollowingPage: ({ usersFollowingPage }) => usersFollowingPage + 1,
        hasMoreUsersFollowingToFetch: (_, { hasMore }) => hasMore,
    },
    'FETCHED_FOLLOWING',
);

const flushFollowingBuffer = roomUsersSearchModel.assign(
    {
        usersFollowing: ({ usersFollowing, bufferUsersFollowing }) => [
            ...usersFollowing,
            ...bufferUsersFollowing,
        ],
        bufferUsersFollowing: () => [],
    },
    undefined,
);

const assignFirstUsersToContext = roomUsersSearchModel.assign(
    {
        filteredUsers: (_, { users }) => users,
        filteredUsersPage: ({ filteredUsersPage }) => filteredUsersPage + 1,
        previousSearchQuery: ({ searchQuery }) => searchQuery,
        hasMoreFilteredUsersToFetch: (_, { hasMore }) => hasMore,
    },
    'FETCHED_USERS',
);

const assignUsersToBufferOfContext = roomUsersSearchModel.assign(
    {
        bufferFilteredUsers: (_, { users }) => users,
        filteredUsersPage: ({ filteredUsersPage }) => filteredUsersPage + 1,
        previousSearchQuery: ({ searchQuery }) => searchQuery,
        hasMoreFilteredUsersToFetch: (_, { hasMore }) => hasMore,
    },
    'FETCHED_USERS',
);

const flushUsersBuffer = roomUsersSearchModel.assign(
    {
        filteredUsers: ({ filteredUsers, bufferFilteredUsers }) => [
            ...filteredUsers,
            ...bufferFilteredUsers,
        ],
        bufferFilteredUsers: () => [],
    },
    undefined,
);

const resetFilteredUsersFetchingDataFromContext = roomUsersSearchModel.assign(
    {
        filteredUsersPage: 1,
    },
    'UPDATE_SEARCH_QUERY',
);

const assignSelectedUserToContext = roomUsersSearchModel.assign(
    {
        selectedUsers: ({ selectedUsers }, { userID }) => [
            ...selectedUsers,
            userID,
        ],
    },
    'SELECT_USER',
);

export const roomUsersSearchMachine = roomUsersSearchModel.createMachine(
    {
        context: roomUsersSearchModel.initialContext,

        type: 'parallel',

        states: {
            searchBar: {
                invoke: {
                    id: 'searchBarMachine',
                    src: appScreenHeaderWithSearchBarMachine,
                },
            },

            users: {
                type: 'parallel',

                states: {
                    debounce: {
                        initial: 'idle',

                        states: {
                            idle: {},

                            debouncing: {
                                after: {
                                    300: {
                                        target: 'idle',

                                        actions: send({
                                            type: 'DEBOUNCED_SEARCH',
                                        }),
                                    },
                                },
                            },
                        },
                    },

                    display: {
                        initial: 'displayFollowing',

                        states: {
                            displayFollowing: {
                                tags: 'displayFollowing',

                                initial: 'fetchFirstFollowing',

                                states: {
                                    hist: {
                                        type: 'history',
                                    },

                                    fetchFirstFollowing: {
                                        tags: 'isLoading',

                                        invoke: {
                                            src: 'fetchFollowing',
                                        },

                                        on: {
                                            FETCHED_FOLLOWING: {
                                                target: 'debounceFirstFollowingFetching',

                                                actions:
                                                    assignFirstFollowingToContext,
                                            },
                                        },
                                    },

                                    debounceFirstFollowingFetching: {
                                        tags: 'isLoading',

                                        after: {
                                            500: {
                                                target: 'waitingForLoadingMore',
                                            },
                                        },
                                    },

                                    waitingForLoadingMore: {
                                        initial: 'idle',

                                        states: {
                                            idle: {
                                                on: {
                                                    FETCH_MORE: {
                                                        cond: ({
                                                            hasMoreUsersFollowingToFetch,
                                                        }) =>
                                                            hasMoreUsersFollowingToFetch,

                                                        target: 'fetchingMoreFollowing',
                                                    },
                                                },
                                            },

                                            fetchingMoreFollowing: {
                                                tags: 'isLoadingMore',

                                                invoke: {
                                                    src: 'fetchFollowing',
                                                },

                                                on: {
                                                    FETCHED_FOLLOWING: {
                                                        target: 'debouncing',

                                                        actions:
                                                            assignFollowingToBufferOfContext,
                                                    },
                                                },
                                            },

                                            debouncing: {
                                                tags: 'isLoadingMore',

                                                /**
                                                 * The debouncing state can exit because of those things:
                                                 * - The timeout has ended
                                                 * - The parent state must exit
                                                 *
                                                 * The first case could be handled in an action of the transition.
                                                 * The second one must be handled in an exit action.
                                                 * So we use an exit action.
                                                 */
                                                exit: flushFollowingBuffer,

                                                after: {
                                                    500: {
                                                        target: 'idle',
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },

                            displayFilteredUsers: {
                                tags: 'displayFilteredUsers',

                                initial: 'fetchingFirstUsers',

                                states: {
                                    fetchingFirstUsers: {
                                        always: {
                                            cond: ({
                                                previousSearchQuery,
                                                searchQuery,
                                            }) => {
                                                const triesToLoadSameUsers =
                                                    previousSearchQuery ===
                                                    searchQuery;

                                                return triesToLoadSameUsers;
                                            },

                                            target: 'waitingForLoadingMore',
                                        },

                                        tags: 'isLoading',

                                        invoke: {
                                            src: 'fetchUsers',
                                        },

                                        on: {
                                            FETCHED_USERS: {
                                                target: 'debounceFetching',

                                                actions:
                                                    assignFirstUsersToContext,
                                            },
                                        },
                                    },

                                    debounceFetching: {
                                        tags: 'isLoading',

                                        after: {
                                            500: {
                                                target: 'waitingForLoadingMore',
                                            },
                                        },
                                    },

                                    waitingForLoadingMore: {
                                        initial: 'idle',

                                        states: {
                                            idle: {
                                                on: {
                                                    FETCH_MORE: {
                                                        cond: ({
                                                            hasMoreFilteredUsersToFetch,
                                                        }) =>
                                                            hasMoreFilteredUsersToFetch,

                                                        target: 'fetchingMoreUsers',
                                                    },
                                                },
                                            },

                                            fetchingMoreUsers: {
                                                tags: 'isLoadingMore',

                                                invoke: {
                                                    src: 'fetchUsers',
                                                },

                                                on: {
                                                    FETCHED_USERS: {
                                                        target: 'debouncing',

                                                        actions:
                                                            assignUsersToBufferOfContext,
                                                    },
                                                },
                                            },

                                            debouncing: {
                                                tags: 'isLoadingMore',

                                                /**
                                                 * The debouncing state can exit because of those things:
                                                 * - The timeout has ended
                                                 * - The parent state must exit
                                                 *
                                                 * The first case could be handled in an action of the transition.
                                                 * The second one must be handled in an exit action.
                                                 * So we use an exit action.
                                                 */
                                                exit: flushUsersBuffer,

                                                after: {
                                                    500: {
                                                        target: 'idle',
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },

                        on: {
                            DEBOUNCED_SEARCH: {
                                target: '.displayFilteredUsers',

                                internal: false,
                            },

                            SELECT_USER: {
                                actions: [
                                    assignSelectedUserToContext,
                                    'userHasBeenSelected',
                                ],
                            },
                        },
                    },
                },

                on: {
                    UPDATE_SEARCH_QUERY: [
                        {
                            cond: (_, { searchQuery }) => {
                                const isSearchQueryEmpty =
                                    searchQuery.length === 0;

                                return isSearchQueryEmpty;
                            },

                            target: '.display.displayFollowing.hist',

                            internal: false,

                            actions: assignSearchQueryToContext,
                        },

                        {
                            target: '.debounce.debouncing',

                            internal: false,

                            actions: [
                                assignSearchQueryToContext,
                                resetFilteredUsersFetchingDataFromContext,
                            ],
                        },
                    ],

                    CLEAR_QUERY: {
                        target: '.display.displayFollowing.hist',

                        internal: false,

                        actions: roomUsersSearchModel.assign({
                            searchQuery: '',
                        }),
                    },

                    CANCEL: {
                        target: '.display.displayFollowing.hist',

                        internal: false,

                        actions: roomUsersSearchModel.assign({
                            searchQuery: '',
                        }),
                    },
                },
            },
        },
    },
    {
        services: {
            fetchFollowing:
                ({ usersFollowingPage }) =>
                async (sendBack) => {
                    try {
                        const {
                            data: following,
                            hasMore,
                            page,
                        } = await fetchMyFollowing({
                            searchQuery: '',
                            page: usersFollowingPage,
                        });

                        sendBack({
                            type: 'FETCHED_FOLLOWING',
                            following,
                            hasMore,
                            page,
                        });
                    } catch (err) {
                        console.error('Failed to fetch following', err);
                    }
                },

            fetchUsers:
                ({ searchQuery, filteredUsersPage }) =>
                async (sendBack) => {
                    console.log('in fetch users service');

                    try {
                        const {
                            data: users,
                            page,
                            hasMore,
                        } = await fetchUsers({
                            searchQuery,
                            page: filteredUsersPage,
                        });

                        console.log('fetched users', users, page, hasMore);

                        sendBack({
                            type: 'FETCHED_USERS',
                            users,
                            hasMore,
                            page,
                        });
                    } catch (err) {
                        console.error(err);
                    }
                },
        },
    },
);
