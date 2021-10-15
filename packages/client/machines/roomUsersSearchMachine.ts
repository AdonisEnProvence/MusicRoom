import { UserSummary } from '@musicroom/types';
import { datatype, internet } from 'faker';
import { send } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { fetchUsers } from '../services/UsersSearchService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const roomUsersSearchModel = createModel(
    {
        usersToDisplay: [] as UserSummary[],

        bufferUsersFriends: [] as UserSummary[],
        usersFriends: [] as UserSummary[],
        usersFriendsPage: 1,
        hasMoreUsersFriendsToFetch: true,

        bufferFilteredUsers: [] as UserSummary[],
        filteredUsers: [] as UserSummary[],
        filteredUsersPage: 1,
        previousSearchQuery: '',
        searchQuery: '',
        hasMoreFilteredUsersToFetch: true,
    },
    {
        events: {
            UPDATE_SEARCH_QUERY: (searchQuery: string) => ({ searchQuery }),

            FETCHED_FRIENDS: (
                friends: UserSummary[],
                hasMore: boolean,
                page: number,
            ) => ({ friends, hasMore, page }),

            FETCHED_USERS: (
                users: UserSummary[],
                hasMore: boolean,
                page: number,
            ) => ({ users, hasMore, page }),

            FETCH_MORE: () => ({}),

            DEBOUNCED_SEARCH: () => ({}),
        },
    },
);

const assignSearchQueryToContext = roomUsersSearchModel.assign(
    {
        searchQuery: (_, { searchQuery }) => searchQuery,
    },
    'UPDATE_SEARCH_QUERY',
);

const assignFirstFriendsToContext = roomUsersSearchModel.assign(
    {
        usersFriends: ({ usersFriends }, { friends }) => [
            ...usersFriends,
            ...friends,
        ],
        usersFriendsPage: ({ usersFriendsPage }) => usersFriendsPage + 1,
        hasMoreUsersFriendsToFetch: (_, { hasMore }) => hasMore,
    },
    'FETCHED_FRIENDS',
);

const assignFriendsToBufferOfContext = roomUsersSearchModel.assign(
    {
        bufferUsersFriends: (_, { friends }) => friends,
        usersFriendsPage: ({ usersFriendsPage }) => usersFriendsPage + 1,
        hasMoreUsersFriendsToFetch: (_, { hasMore }) => hasMore,
    },
    'FETCHED_FRIENDS',
);

const flushFriendsBuffer = roomUsersSearchModel.assign(
    {
        usersFriends: ({ usersFriends, bufferUsersFriends }) => [
            ...usersFriends,
            ...bufferUsersFriends,
        ],
        bufferUsersFriends: () => [],
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

export const roomUsersSearchMachine = roomUsersSearchModel.createMachine(
    {
        context: roomUsersSearchModel.initialContext,

        type: 'parallel',

        states: {
            searchBar: {
                invoke: [
                    {
                        id: 'searchBarMachine',
                        src: appScreenHeaderWithSearchBarMachine,
                    },
                    {
                        src: () => () => {
                            console.log('root service reinvoked');
                        },
                    },
                ],
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
                        initial: 'displayFriends',

                        states: {
                            displayFriends: {
                                tags: 'displayFriends',

                                initial: 'fetchFirstFriends',

                                states: {
                                    hist: {
                                        type: 'history',
                                    },

                                    fetchFirstFriends: {
                                        tags: 'isLoading',

                                        invoke: {
                                            src: 'fetchFriends',
                                        },

                                        on: {
                                            FETCHED_FRIENDS: {
                                                target: 'debounceFirstFriendsFetching',

                                                actions:
                                                    assignFirstFriendsToContext,
                                            },
                                        },
                                    },

                                    debounceFirstFriendsFetching: {
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
                                                            hasMoreUsersFriendsToFetch,
                                                        }) =>
                                                            hasMoreUsersFriendsToFetch,

                                                        target: 'fetchingMoreFriends',
                                                    },
                                                },
                                            },

                                            fetchingMoreFriends: {
                                                tags: 'isLoadingMore',

                                                invoke: {
                                                    src: 'fetchFriends',
                                                },

                                                on: {
                                                    FETCHED_FRIENDS: {
                                                        target: 'debouncing',

                                                        actions:
                                                            assignFriendsToBufferOfContext,
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
                                                exit: flushFriendsBuffer,

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

                            target: '.display.displayFriends.hist',

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
                },
            },
        },
    },
    {
        services: {
            fetchFriends:
                ({ usersFriendsPage }) =>
                (sendBack) => {
                    console.log('fetch friends');

                    setTimeout(() => {
                        if (usersFriendsPage === 1) {
                            sendBack({
                                type: 'FETCHED_FRIENDS',
                                friends: Array.from({ length: 10 }).map(() => ({
                                    id: datatype.uuid(),
                                    nickname: `Friend ${internet.userName()}`,
                                })),
                                hasMore: true,
                                page: 1,
                            });
                        } else if (usersFriendsPage === 2) {
                            sendBack({
                                type: 'FETCHED_FRIENDS',
                                friends: Array.from({ length: 10 }).map(() => ({
                                    id: datatype.uuid(),
                                    nickname: `Friend ${internet.userName()}`,
                                })),
                                hasMore: true,
                                page: 2,
                            });
                        } else if (usersFriendsPage === 3) {
                            sendBack({
                                type: 'FETCHED_FRIENDS',
                                friends: Array.from({ length: 10 }).map(() => ({
                                    id: datatype.uuid(),
                                    nickname: `Friend ${internet.userName()}`,
                                })),
                                hasMore: true,
                                page: 3,
                            });
                        } else if (usersFriendsPage === 4) {
                            sendBack({
                                type: 'FETCHED_FRIENDS',
                                friends: Array.from({ length: 5 }).map(() => ({
                                    id: datatype.uuid(),
                                    nickname: `Friend ${internet.userName()}`,
                                })),
                                hasMore: false,
                                page: 4,
                            });
                        }
                    }, 100);
                },

            fetchUsers:
                ({ searchQuery, filteredUsersPage }) =>
                async (sendBack) => {
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
