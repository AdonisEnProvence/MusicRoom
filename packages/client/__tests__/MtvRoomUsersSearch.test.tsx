import React from 'react';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestingModel } from '@xstate/test';
import { ContextFrom, StateFrom } from 'xstate';
import * as z from 'zod';
import { internet } from 'faker';
import { NavigationContainer } from '@react-navigation/native';
import { UserSummary, MtvRoomCreatorInviteUserArgs } from '@musicroom/types';
import {
    fireEvent,
    noop,
    render,
    within,
    waitFor,
    getFakeUsersList,
} from '../tests/tests-utils';
import {
    db,
    generateArray,
    generateMtvWorklowState,
    generateUserSummary,
} from '../tests/data';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { friends } from '../services/UsersSearchService';
import { serverSocket } from '../services/websockets';

interface TestingContext {
    screen: ReturnType<typeof render>;
    creatorInviteUserMock: jest.Mock<void, [MtvRoomCreatorInviteUserArgs]>;
}

const FRIENDS_PAGE_LENGTH = 10;
const USERS_PAGE_LENGTH = 10;

const fakeFriends = generateArray({
    minLength: 30,
    maxLength: 39,
    fill: generateUserSummary,
});
const fakeFriendsPagesCount = Math.floor(
    fakeFriends.length / FRIENDS_PAGE_LENGTH + 1,
);

const fakeUsers = [
    ...generateArray({
        minLength: 10,
        maxLength: 19,
        fill: () =>
            generateUserSummary({ nickname: `A${internet.userName()}` }),
    }),
    ...generateArray({
        minLength: 10,
        maxLength: 19,
        fill: generateUserSummary,
    }),
];

function filterUsersByNickname(
    users: UserSummary[],
    expectedNickname: string,
): UserSummary[] {
    return users.filter(({ nickname }) =>
        nickname.toLowerCase().startsWith(expectedNickname.toLowerCase()),
    );
}

function getPage<Item>(
    items: Item[],
    page: number,
    pageLength: number,
): Item[] {
    return items.slice((page - 1) * pageLength, page * pageLength);
}

const mtvRoomUsersSearchModel = createModel(
    {
        searchQuery: '',
        friendsPage: 1,
        usersPage: 1,

        invitedFriendNickname: '',
        invitedUserNickname: '',
    },
    {
        events: {
            LOAD_MORE: () => ({}),

            SEARCH_USERS_BY_NICKNAME: (nickname: string) => ({ nickname }),

            INVITE_FRIEND: (nickname: string) => ({ nickname }),

            INVITE_USER: (nickname: string) => ({ nickname }),
        },
    },
);

const SearchUsersByNicknameEvent = z
    .object({
        nickname: z.string(),
    })
    .nonstrict();
type SearchUsersByNicknameEvent = z.infer<typeof SearchUsersByNicknameEvent>;

const InviteFriendEvent = z
    .object({
        nickname: z.string(),
    })
    .nonstrict();
type InviteFriendEvent = z.infer<typeof InviteFriendEvent>;

const InviteUserEvent = z
    .object({
        nickname: z.string(),
    })
    .nonstrict();
type InviteUserEvent = z.infer<typeof InviteUserEvent>;

const incrementFriendsPageToContext = mtvRoomUsersSearchModel.assign(
    {
        friendsPage: ({ friendsPage }) => friendsPage + 1,
    },
    'LOAD_MORE',
);

const incrementUsersPageToContext = mtvRoomUsersSearchModel.assign(
    {
        usersPage: ({ usersPage }) => usersPage + 1,
    },
    'LOAD_MORE',
);

const assignSearchQueryToContext = mtvRoomUsersSearchModel.assign(
    {
        searchQuery: (_, { nickname }) => nickname,
    },
    'SEARCH_USERS_BY_NICKNAME',
);

const assignInvitedFriendNicknameToContext = mtvRoomUsersSearchModel.assign(
    {
        invitedFriendNickname: (_, { nickname }) => nickname,
    },
    'INVITE_FRIEND',
);

const assignInvitedUserNicknameToContext = mtvRoomUsersSearchModel.assign(
    {
        invitedUserNickname: (_, { nickname }) => nickname,
    },
    'INVITE_USER',
);

type MtvRoomUsersSearchMachineState = StateFrom<
    typeof mtvRoomUsersSearchMachine
>;

const mtvRoomUsersSearchMachine = mtvRoomUsersSearchModel.createMachine({
    initial: 'friendsView',

    states: {
        friendsView: {
            initial: 'fetching',

            states: {
                fetching: {
                    meta: {
                        test: async (
                            { screen }: TestingContext,
                            {
                                context: { friendsPage },
                            }: MtvRoomUsersSearchMachineState,
                        ) => {
                            for (const { nickname } of getPage(
                                fakeFriends,
                                friendsPage,
                                FRIENDS_PAGE_LENGTH,
                            )) {
                                const userCard = await screen.findByTestId(
                                    `${nickname}-user-card`,
                                );
                                expect(userCard).toBeTruthy();
                                expect(userCard).toHaveTextContent(nickname);
                            }
                        },
                    },

                    always: {
                        cond: ({ friendsPage }) =>
                            friendsPage === fakeFriendsPagesCount,

                        target: 'fetchedAllFriends',
                    },

                    on: {
                        LOAD_MORE: {
                            actions: incrementFriendsPageToContext,
                        },

                        INVITE_FRIEND: {
                            target: 'invitedFriend',

                            actions: assignInvitedFriendNicknameToContext,
                        },
                    },
                },

                invitedFriend: {
                    type: 'final',

                    meta: {
                        test: async (
                            { creatorInviteUserMock }: TestingContext,
                            {
                                context: { invitedFriendNickname },
                            }: MtvRoomUsersSearchMachineState,
                        ) => {
                            const invitedFriend = fakeFriends.find(
                                ({ nickname: friendNickname }) =>
                                    friendNickname === invitedFriendNickname,
                            );
                            if (invitedFriend === undefined) {
                                throw new Error(
                                    `Could not find a friend with nickname: ${invitedFriendNickname}`,
                                );
                            }

                            await waitFor(() => {
                                expect(
                                    creatorInviteUserMock,
                                ).toHaveBeenNthCalledWith<
                                    [MtvRoomCreatorInviteUserArgs]
                                >(1, {
                                    invitedUserID: invitedFriend.userID,
                                });
                            });
                        },
                    },
                },

                fetchedAllFriends: {
                    type: 'final',

                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            for (const { nickname } of getPage(
                                fakeFriends,
                                fakeFriendsPagesCount,
                                FRIENDS_PAGE_LENGTH,
                            )) {
                                const userCard = await screen.findByTestId(
                                    `${nickname}-user-card`,
                                );
                                expect(userCard).toBeTruthy();
                                expect(userCard).toHaveTextContent(nickname);
                            }

                            const loadMoreButton =
                                screen.queryByText(/load.*more/i);
                            expect(loadMoreButton).toBeNull();
                        },
                    },
                },
            },

            on: {
                SEARCH_USERS_BY_NICKNAME: {
                    target: 'usersView',

                    actions: assignSearchQueryToContext,
                },
            },
        },

        usersView: {
            initial: 'fetching',

            states: {
                fetching: {
                    meta: {
                        test: async (
                            { screen }: TestingContext,
                            {
                                context: { searchQuery, usersPage },
                            }: MtvRoomUsersSearchMachineState,
                        ) => {
                            const filteredUsers = filterUsersByNickname(
                                fakeUsers,
                                searchQuery,
                            );
                            const page = getPage(
                                filteredUsers,
                                usersPage,
                                USERS_PAGE_LENGTH,
                            );

                            for (const { nickname } of page) {
                                const userCard = await screen.findByTestId(
                                    `${nickname}-user-card`,
                                );
                                expect(userCard).toBeTruthy();
                                expect(userCard).toHaveTextContent(nickname);
                            }
                        },
                    },

                    always: {
                        cond: ({ searchQuery, usersPage }) => {
                            const filteredUsers = filterUsersByNickname(
                                fakeUsers,
                                searchQuery,
                            );
                            const totalFetchedUsers =
                                usersPage * USERS_PAGE_LENGTH;
                            const hasMoreUsersToFetch =
                                filteredUsers.length > totalFetchedUsers;
                            const hasNoMoreUsersToFetch = !hasMoreUsersToFetch;

                            return hasNoMoreUsersToFetch;
                        },

                        target: 'fetchedAllUsersForSearchQuery',
                    },

                    on: {
                        LOAD_MORE: {
                            actions: incrementUsersPageToContext,
                        },

                        INVITE_USER: {
                            target: 'invitedUser',

                            actions: assignInvitedUserNicknameToContext,
                        },
                    },
                },

                invitedUser: {
                    type: 'final',

                    meta: {
                        test: async (
                            { creatorInviteUserMock }: TestingContext,
                            {
                                context: { invitedUserNickname },
                            }: MtvRoomUsersSearchMachineState,
                        ) => {
                            const invitedUser = fakeUsers.find(
                                ({ nickname: friendNickname }) =>
                                    friendNickname === invitedUserNickname,
                            );
                            if (invitedUser === undefined) {
                                throw new Error(
                                    `Could not find a user with nickname: ${invitedUserNickname}`,
                                );
                            }

                            await waitFor(() => {
                                expect(
                                    creatorInviteUserMock,
                                ).toHaveBeenNthCalledWith<
                                    [MtvRoomCreatorInviteUserArgs]
                                >(1, {
                                    invitedUserID: invitedUser.userID,
                                });
                            });
                        },
                    },
                },

                fetchedAllUsersForSearchQuery: {
                    type: 'final',

                    meta: {
                        test: async (
                            { screen }: TestingContext,
                            {
                                context: { searchQuery, usersPage },
                            }: MtvRoomUsersSearchMachineState,
                        ) => {
                            const filteredUsers = filterUsersByNickname(
                                fakeUsers,
                                searchQuery,
                            );
                            const page = getPage(
                                filteredUsers,
                                usersPage,
                                USERS_PAGE_LENGTH,
                            );

                            for (const { nickname } of page) {
                                const userCard = await screen.findByTestId(
                                    `${nickname}-user-card`,
                                );
                                expect(userCard).toBeTruthy();
                                expect(userCard).toHaveTextContent(nickname);
                            }

                            const loadMoreButton =
                                screen.queryByText(/load.*more/i);
                            expect(loadMoreButton).toBeNull();
                        },
                    },
                },
            },
        },
    },
});

const mtvRoomUsersSearchTestingModel = createTestingModel<
    TestingContext,
    ContextFrom<typeof mtvRoomUsersSearchMachine>
>(mtvRoomUsersSearchMachine).withEvents({
    LOAD_MORE: async ({ screen }) => {
        const loadMoreButton = await screen.findByText(/load.*more/i);
        expect(loadMoreButton).toBeTruthy();

        fireEvent.press(loadMoreButton);
    },

    SEARCH_USERS_BY_NICKNAME: {
        exec: async ({ screen }, event) => {
            const { nickname } = SearchUsersByNicknameEvent.parse(event);

            const [, searchUsersInput] = await screen.findAllByPlaceholderText(
                /search.*user.*by.*name/i,
            );
            expect(searchUsersInput).toBeTruthy();

            fireEvent(searchUsersInput, 'focus');
            fireEvent.changeText(searchUsersInput, nickname);
        },

        cases: [
            {
                nickname: fakeUsers[0].nickname.charAt(0),
            },
        ] as SearchUsersByNicknameEvent[],
    },

    INVITE_FRIEND: {
        exec: async ({ screen }, event) => {
            const { nickname } = InviteFriendEvent.parse(event);

            const userCard = await screen.findByTestId(`${nickname}-user-card`);
            expect(userCard).toBeTruthy();
            expect(userCard).toHaveTextContent(nickname);

            fireEvent.press(userCard);
        },

        cases: [
            {
                nickname: fakeFriends[0].nickname,
            },
        ] as InviteUserEvent[],
    },

    INVITE_USER: {
        exec: async ({ screen }, event) => {
            const { nickname } = InviteUserEvent.parse(event);

            const userCard = await screen.findByTestId(`${nickname}-user-card`);
            expect(userCard).toBeTruthy();
            expect(userCard).toHaveTextContent(nickname);

            fireEvent.press(userCard);
        },

        cases: [
            {
                nickname: fakeUsers[0].nickname,
            },
        ] as InviteUserEvent[],
    },
});

describe('Display friends and search users', () => {
    const testPlans = mtvRoomUsersSearchTestingModel.getSimplePathPlansTo(
        (state) => {
            const { friendsPage, invitedFriendNickname } = state.context;

            const invitedOneUser = state.matches({ usersView: 'invitedUser' });
            if (invitedOneUser === true) {
                const didNotLoadMoreFriends = friendsPage === 1;
                const didNotInviteFriend = invitedFriendNickname === '';

                return didNotLoadMoreFriends && didNotInviteFriend;
            }

            /**
             * Go to final state of usersView after:
             * - do not fetching more friends
             * - fetching all friends
             */
            const displayedAllUsersForSearchQuery = state.matches({
                usersView: 'fetchedAllUsersForSearchQuery',
            });

            return (
                displayedAllUsersForSearchQuery === true &&
                (friendsPage === 1 || friendsPage === fakeFriendsPagesCount)
            );
        },
    );

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    const initialState = generateMtvWorklowState({
                        userType: 'CREATOR',
                    });
                    const fakeUsersArray = getFakeUsersList({
                        directMode: false,
                        isMeIsCreator: true,
                    });

                    friends.length = 0;
                    friends.push(...fakeFriends);

                    for (const fakeUser of fakeUsers) {
                        db.searchableUsers.create(fakeUser);
                    }

                    serverSocket.on('GET_CONTEXT', () => {
                        serverSocket.emit('RETRIEVE_CONTEXT', initialState);
                    });

                    serverSocket.on('GET_USERS_LIST', (cb) => {
                        cb(fakeUsersArray);
                    });

                    const creatorInviteUserMock: jest.Mock<
                        void,
                        [MtvRoomCreatorInviteUserArgs]
                    > = jest.fn();

                    serverSocket.on(
                        'CREATOR_INVITE_USER',
                        creatorInviteUserMock,
                    );

                    const screen = render(
                        <NavigationContainer
                            ref={navigationRef}
                            onReady={() => {
                                isReadyRef.current = true;
                            }}
                        >
                            <RootNavigator
                                colorScheme="dark"
                                toggleColorScheme={noop}
                            />
                        </NavigationContainer>,
                    );

                    expect(
                        screen.getAllByText(/home/i).length,
                    ).toBeGreaterThanOrEqual(1);

                    const musicPlayerMini =
                        screen.getByTestId('music-player-mini');
                    expect(musicPlayerMini).toBeTruthy();

                    const miniPlayerTrackTitle = await within(
                        musicPlayerMini,
                    ).findByText(
                        `${initialState.currentTrack?.title} • ${initialState.currentTrack?.artistName}`,
                    );
                    expect(miniPlayerTrackTitle).toBeTruthy();

                    fireEvent.press(miniPlayerTrackTitle);

                    const musicPlayerFullScreen = await screen.findByA11yState({
                        expanded: true,
                    });
                    expect(musicPlayerFullScreen).toBeTruthy();

                    const listenersButton = within(
                        musicPlayerFullScreen,
                    ).getByText(/listeners/i);
                    expect(listenersButton).toBeTruthy();

                    fireEvent.press(listenersButton);

                    await waitFor(() => {
                        const usersListScreen =
                            screen.getByText(/users.*list/i);
                        expect(usersListScreen).toBeTruthy();
                    });

                    const inviteUserButton =
                        screen.getByA11yLabel(/invite.*user/i);
                    expect(inviteUserButton).toBeTruthy();

                    fireEvent.press(inviteUserButton);

                    await waitFor(() => {
                        const [, usersSearchInput] =
                            screen.getAllByPlaceholderText(
                                /search.*user.*by.*name/i,
                            );
                        expect(usersSearchInput).toBeTruthy();
                    });

                    await path.test({
                        screen,
                        creatorInviteUserMock,
                    });
                });
            });
        });
    });

    it('should have full coverage', () => {
        mtvRoomUsersSearchTestingModel.testCoverage({
            /**
             * Generate coverage only for states with a meta.test property
             */
            filter: (state) => typeof state.meta?.test === 'function',
        });
    });
});

test('Users outside of creator can not access to users search', async () => {
    const initialState = generateMtvWorklowState({
        userType: 'USER',
    });

    serverSocket.on('GET_CONTEXT', () => {
        serverSocket.emit('RETRIEVE_CONTEXT', initialState);
    });

    const screen = render(
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                isReadyRef.current = true;
            }}
        >
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    const miniPlayerTrackTitle = await within(musicPlayerMini).findByText(
        `${initialState.currentTrack?.title} • ${initialState.currentTrack?.artistName}`,
    );
    expect(miniPlayerTrackTitle).toBeTruthy();

    fireEvent.press(miniPlayerTrackTitle);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    const listenersButton = within(musicPlayerFullScreen).getByText(
        /listeners/i,
    );
    expect(listenersButton).toBeTruthy();

    fireEvent.press(listenersButton);

    await waitFor(() => {
        const usersListScreen = screen.getByText(/users.*list/i);
        expect(usersListScreen).toBeTruthy();
    });

    const inviteUserButton = screen.queryByA11yLabel(/invite.*user/i);
    expect(inviteUserButton).toBeNull();
});
