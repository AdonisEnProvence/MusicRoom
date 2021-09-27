import { createModel } from 'xstate/lib/model';
import { ContextFrom, EventFrom, StateMachine } from 'xstate';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

interface MtvRoomUser {
    id: string;
}

const roomUsersListModel = createModel(
    {
        allUsers: [] as MtvRoomUser[],
        filteredUsers: [] as MtvRoomUser[],
        searchQuery: '',
    },
    {
        events: {
            UPDATE_SEARCH_QUERY: (searchQuery: string) => ({ searchQuery }),

            SET_USERS: (users: MtvRoomUser[]) => ({ users }),
        },
    },
);

const assignSearchQueryToContext = roomUsersListModel.assign(
    {
        searchQuery: (_, { searchQuery }) => searchQuery,
    },
    'UPDATE_SEARCH_QUERY',
);

const assignFilteredUsersToContext = roomUsersListModel.assign(
    {
        filteredUsers: (_, { users }) => users,
    },
    'SET_USERS',
);

interface CreateRoomUsersListMachineArgs {
    users: MtvRoomUser[];
}

export const createRoomUsersListMachine = ({
    users,
}: CreateRoomUsersListMachineArgs): StateMachine<
    ContextFrom<typeof roomUsersListModel>,
    any,
    EventFrom<typeof roomUsersListModel>
> => {
    return roomUsersListModel.createMachine({
        context: {
            ...roomUsersListModel.initialContext,
            allUsers: users,
            filteredUsers: users,
        },

        initial: 'idle',

        invoke: {
            id: 'searchBarMachine',
            src: appScreenHeaderWithSearchBarMachine,
        },

        states: {
            idle: {},

            debouncingQuery: {
                after: {
                    300: {
                        target: 'filteringUsers',
                    },
                },
            },

            filteringUsers: {
                invoke: {
                    id: 'filteringUsers',

                    src:
                        ({ allUsers, searchQuery }) =>
                        (sendBack) => {
                            const filteredUsers = allUsers.filter(({ id }) =>
                                id.startsWith(searchQuery),
                            );

                            sendBack({
                                type: 'SET_USERS',
                                users: filteredUsers,
                            });
                        },
                },

                on: {
                    SET_USERS: {
                        target: 'idle',

                        actions: assignFilteredUsersToContext,
                    },
                },
            },
        },

        on: {
            UPDATE_SEARCH_QUERY: {
                target: '.debouncingQuery',

                actions: [assignSearchQueryToContext],
            },
        },
    });
};
