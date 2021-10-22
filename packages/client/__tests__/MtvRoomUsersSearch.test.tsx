import React from 'react';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestingModel } from '@xstate/test';
import { ContextFrom, StateFrom } from 'xstate';
import * as z from 'zod';
import { datatype, internet } from 'faker';
import { NavigationContainer } from '@react-navigation/native';
import { UserSummary } from '@musicroom/types';
import { fireEvent, noop, render } from '../tests/tests-utils';
import { db, generateArray, generateUserSummary } from '../tests/data';
import { RootNavigator } from '../navigation';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { friends } from '../services/UsersSearchService';

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const FRIENDS_PAGE_LENGTH = 10;
const USERS_PAGE_LENGTH = 10;

const fakeFriends = generateArray(
    datatype.number({
        min: 30,
        max: 39,
    }),
    generateUserSummary,
);
const fakeFriendsPagesCount = Math.floor(
    fakeFriends.length / FRIENDS_PAGE_LENGTH + 1,
);

const fakeUsers = [
    ...generateArray(
        datatype.number({
            min: 10,
            max: 19,
        }),
        () => generateUserSummary({ nickname: `A${internet.userName()}` }),
    ),
    ...generateArray(
        datatype.number({
            min: 10,
            max: 19,
        }),
        generateUserSummary,
    ),
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
    },
    {
        events: {
            LOAD_MORE: () => ({}),

            SEARCH_USERS_BY_NICKNAME: (nickname: string) => ({ nickname }),
        },
    },
);

const SearchUsersByNicknameEvent = z
    .object({
        nickname: z.string(),
    })
    .nonstrict();
type SearchUsersByNicknameEvent = z.infer<typeof SearchUsersByNicknameEvent>;

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

            const searchUsersInput = await screen.findByPlaceholderText(
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
});

describe('Display friends and search users', () => {
    const testPlans = mtvRoomUsersSearchTestingModel.getSimplePathPlansTo(
        (state) => {
            const { friendsPage } = state.context;

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
                    friends.length = 0;
                    friends.push(...fakeFriends);

                    for (const fakeUser of fakeUsers) {
                        db.searchableUsers.create(fakeUser);
                    }

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

                    const goToUsersSearchButton = screen.getByText(
                        /go.*to.*users.*search/i,
                    );
                    expect(goToUsersSearchButton).toBeTruthy();

                    fireEvent.press(goToUsersSearchButton);

                    const usersSearchInput = await screen.findByPlaceholderText(
                        /search.*user.*by.*name/i,
                    );
                    expect(usersSearchInput).toBeTruthy();

                    await path.test({
                        screen,
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
