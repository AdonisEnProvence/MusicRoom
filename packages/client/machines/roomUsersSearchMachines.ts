import { UserSummary } from '@musicroom/types';
import { createModel } from 'xstate/lib/model';
import { fetchUsers } from '../services/UsersSearchService';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const roomUsersSearchModel = createModel(
    {
        usersToDisplay: [] as UserSummary[],

        usersFriends: [] as UserSummary[],
        usersFriendsPage: 1,

        filteredUsers: [] as UserSummary[],
        filteredUsersPage: 1,
        searchQuery: '',
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
        filteredUsers: ({ filteredUsers }, { users }) => [
            ...filteredUsers,
            ...users,
        ],
        filteredUsersPage: ({ filteredUsersPage }) => filteredUsersPage + 1,
    },
    'FETCHED_USERS',
);

const resetUsersFromContext = roomUsersSearchModel.assign(
    {
        filteredUsers: () => [],
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
                                        invoke: {
                                            src: 'fetchFriends',
                                        },

                                        on: {
                                            FETCHED_FRIENDS: {
                                                target: 'idle',

                                                actions: assignFriendsToContext,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },

                    displayFilteredUsers: {
                        tags: 'displayFilteredUsers',

                        initial: 'deboucing',

                        states: {
                            deboucing: {
                                after: {
                                    300: {
                                        target: 'fetching',
                                    },
                                },
                            },

                            fetching: {
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
                    UPDATE_SEARCH_QUERY: [
                        {
                            cond: (_, { searchQuery }) => {
                                const isSearchQueryEmpty =
                                    searchQuery.length === 0;

                                return isSearchQueryEmpty;
                            },

                            target: '.displayFriends.hist',

                            internal: false,

                            actions: assignSearchQueryToContext,
                        },

                        {
                            target: '.displayFilteredUsers.deboucing',

                            internal: false,

                            actions: [
                                assignSearchQueryToContext,
                                resetUsersFromContext,
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
