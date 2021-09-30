import { MtvRoomUsersListElement } from '@musicroom/types';
import { ContextFrom, EventFrom, forwardTo, StateMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { SocketClient } from '../contexts/SocketContext';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

type OptionnalMtvRoomUsersListElement = MtvRoomUsersListElement | undefined;

const roomUsersListModel = createModel(
    {
        allUsers: [] as MtvRoomUsersListElement[],
        filteredUsers: [] as MtvRoomUsersListElement[],
        searchQuery: '',
        selectedUser: undefined as OptionnalMtvRoomUsersListElement,
        deviceOwnerUser: undefined as OptionnalMtvRoomUsersListElement,
        deviceOwnerUserID: '',
    },
    {
        events: {
            UPDATE_SEARCH_QUERY: (searchQuery: string) => ({ searchQuery }),

            RETRIEVE_USERS_LIST: () => ({}),

            ASSIGN_RETRIEVED_USERS_LIST: (
                retrievedUsers: MtvRoomUsersListElement[],
            ) => ({ retrievedUsers }),

            SET_USERS: (users: MtvRoomUsersListElement[]) => ({ users }),

            SET_SELECTED_USER: (selectedUser: MtvRoomUsersListElement) => ({
                selectedUser,
            }),

            SET_AS_DELEGATION_OWNER: (userID: string) => ({ userID }),

            TOGGLE_CONTROL_AND_DELEGATION_PERMISSION: (userID: string) => ({
                userID,
            }),
        },
    },
);

const assignSearchQueryToContext = roomUsersListModel.assign(
    {
        searchQuery: (_, { searchQuery }) => searchQuery,
    },
    'UPDATE_SEARCH_QUERY',
);

const assignSelectedUser = roomUsersListModel.assign(
    {
        selectedUser: (_, { selectedUser }) => selectedUser,
    },
    'SET_SELECTED_USER',
);

const assignFilteredUsersToContext = roomUsersListModel.assign(
    {
        filteredUsers: (_, { users }) => users,
    },
    'SET_USERS',
);

const assignRetrievedUsersListToContext = roomUsersListModel.assign(
    {
        allUsers: (_, { retrievedUsers }) => retrievedUsers,
        deviceOwnerUser: (context, { retrievedUsers }) =>
            retrievedUsers.find(
                (user) => user.userID === context.deviceOwnerUserID,
            ),
    },
    'ASSIGN_RETRIEVED_USERS_LIST',
);

interface CreateRoomUsersListMachineArgs {
    socket: SocketClient;
    deviceOwnerUserID: string;
}

export const createRoomUsersListMachine = ({
    socket,
    deviceOwnerUserID,
}: CreateRoomUsersListMachineArgs): StateMachine<
    ContextFrom<typeof roomUsersListModel>,
    any,
    EventFrom<typeof roomUsersListModel>
> => {
    return roomUsersListModel.createMachine({
        context: {
            ...roomUsersListModel.initialContext,
            allUsers: [],
            filteredUsers: [],
            selectedUser: undefined,
            deviceOwnerUserID,
        },

        invoke: [
            {
                id: 'searchBarMachine',
                src: appScreenHeaderWithSearchBarMachine,
            },
            {
                id: 'socketConnection',
                src: (context, _event) => (sendBack, onReceive) => {
                    socket.on('USERS_LIST_FORCED_REFRESH', () => {
                        sendBack({
                            type: 'RETRIEVE_USERS_LIST',
                        });
                    });

                    onReceive((e) => {
                        switch (e.type) {
                            case 'RETRIEVE_USERS_LIST': {
                                socket.emit(
                                    'GET_USERS_LIST',
                                    (retrievedUsers) => {
                                        sendBack({
                                            type: 'ASSIGN_RETRIEVED_USERS_LIST',
                                            retrievedUsers,
                                        });
                                    },
                                );

                                break;
                            }
                        }
                    });
                },
            },
        ],

        exit: () => socket.off('USERS_LIST_FORCED_REFRESH'),

        initial: 'firstUsersListFetch',

        states: {
            firstUsersListFetch: {
                invoke: {
                    src: () => (sendBack) => {
                        sendBack({
                            type: 'RETRIEVE_USERS_LIST',
                        });
                    },
                },
            },

            machineIsReady: {
                initial: 'idle',

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
                                    const filteredUsers = allUsers.filter(
                                        ({ userID }) =>
                                            userID.startsWith(searchQuery),
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

                    SET_SELECTED_USER: {
                        actions: [assignSelectedUser],
                    },
                },
            },
        },
        on: {
            RETRIEVE_USERS_LIST: {
                target: '.machineIsReady',
                actions: forwardTo('socketConnection'),
            },

            ASSIGN_RETRIEVED_USERS_LIST: {
                actions: assignRetrievedUsersListToContext,
            },
        },
    });
};
