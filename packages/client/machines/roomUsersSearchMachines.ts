import { UserSummary } from '@musicroom/types';
import { send } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { fetchUsers } from '../services/UsersSearchService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const roomUsersSearchModel = createModel(
    {
        usersToDisplay: [] as UserSummary[],

        usersFriends: [] as UserSummary[],
        usersFriendsPage: 1,
        hasMoreUsersFriendsToFetch: true,

        filteredUsers: [] as UserSummary[],
        filteredUsersPage: 1,
        previousSearchQuery: '',
        searchQuery: '',
        hasMoreFilteredUsersToFetch: true,
    },
    {
        events: {
            UPDATE_SEARCH_QUERY: (searchQuery: string) => ({ searchQuery }),

            FETCHED_FRIENDS: (friends: UserSummary[]) => ({ friends }),

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

const assignFriendsToContext = roomUsersSearchModel.assign(
    {
        usersFriends: ({ usersFriends }, { friends }) => [
            ...usersFriends,
            ...friends,
        ],
        usersFriendsPage: ({ usersFriendsPage }) => usersFriendsPage + 1,
    },
    'FETCHED_FRIENDS',
);

const assignUsersToContext = roomUsersSearchModel.assign(
    {
        filteredUsers: ({ filteredUsers }, { users, page }) => {
            const isFirstFetching = page === 1;
            if (isFirstFetching === true) {
                return users;
            }

            return [...filteredUsers, ...users];
        },
        filteredUsersPage: ({ filteredUsersPage }) => filteredUsersPage + 1,
        previousSearchQuery: ({ searchQuery }) => searchQuery,
    },
    'FETCHED_USERS',
);

const resetFilteredUsersFetchingDataFromContext = roomUsersSearchModel.assign(
    {
        filteredUsersPage: 1,
        hasMoreFilteredUsersToFetch: true,
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
                                                target: 'waitingForLoadingMore',

                                                actions: assignFriendsToContext,
                                            },
                                        },
                                    },

                                    waitingForLoadingMore: {
                                        initial: 'idle',

                                        states: {
                                            idle: {
                                                on: {
                                                    FETCH_MORE: {
                                                        target: 'fetching',
                                                    },
                                                },
                                            },

                                            fetching: {
                                                tags: 'isLoading',

                                                invoke: {
                                                    src: 'fetchFriends',
                                                },

                                                on: {
                                                    FETCHED_FRIENDS: {
                                                        target: 'idle',

                                                        actions:
                                                            assignFriendsToContext,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },

                            displayFilteredUsers: {
                                initial: 'fetching',

                                states: {
                                    fetching: {
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

                                        tags: [
                                            'isLoading',
                                            'displayFilteredUsers',
                                        ],

                                        invoke: {
                                            src: 'fetchUsers',
                                        },

                                        on: {
                                            FETCHED_USERS: {
                                                target: 'waitingForLoadingMore',

                                                actions: assignUsersToContext,
                                            },
                                        },
                                    },

                                    waitingForLoadingMore: {
                                        tags: 'displayFilteredUsers',

                                        on: {
                                            FETCH_MORE: {
                                                target: 'fetching',
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
                        sendBack({
                            type: 'FETCHED_FRIENDS',
                            friends: [
                                {
                                    id: `lololol-${usersFriendsPage}`,
                                    nickname: `Friend Bastard77-${usersFriendsPage}`,
                                },
                            ],
                        });
                    }, 300);
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
