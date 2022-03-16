import {
    MtvRoomCreatorInviteUserArgs,
    MtvWorkflowState,
    UserSummary,
} from '@musicroom/types';
import { createModel as createTestingModel } from '@xstate/test';
import { internet } from 'faker';
import { ContextFrom, StateFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import * as z from 'zod';
import { serverSocket } from '../services/websockets';
import {
    db,
    generateArray,
    generateMtvWorklowState,
    generateUserSummary,
} from '../tests/data';
import {
    CLIENT_INTEG_TEST_USER_ID,
    fireEvent,
    getFakeUsersList,
    render,
    renderApp,
    waitFor,
    waitForElementToBeRemoved,
    within,
} from '../tests/tests-utils';

async function renderInviteUsers(
    initialState: MtvWorkflowState,
): Promise<ReturnType<typeof render>> {
    const screen = await renderApp();

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

    const inviteUserButton = screen.getByA11yLabel(/invite.*user/i);
    expect(inviteUserButton).toBeTruthy();

    fireEvent.press(inviteUserButton);

    await waitFor(() => {
        const [, usersSearchInput] = screen.getAllByPlaceholderText(
            /search.*user.*by.*name/i,
        );
        expect(usersSearchInput).toBeTruthy();
    });

    return screen;
}

interface TestingContext {
    screen: ReturnType<typeof render>;
    creatorInviteUserMock: jest.Mock<void, [MtvRoomCreatorInviteUserArgs]>;
}

const FOLLOWING_PAGE_LENGTH = 10;
const USERS_PAGE_LENGTH = 10;

const fakeFollowing = generateArray({
    minLength: 30,
    maxLength: 39,
    fill: generateUserSummary,
});
const fakeFollowingPagesCount = Math.floor(
    fakeFollowing.length / FOLLOWING_PAGE_LENGTH + 1,
);

const fakeUsers = generateArray({
    minLength: 10,
    maxLength: 19,
    fill: () => generateUserSummary({ nickname: `A${internet.userName()}` }),
});

const fakeFollowingAndUsers = [...fakeFollowing, ...fakeUsers];

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
        followingPage: 1,
        usersPage: 1,

        invitedFollowingNickname: '',
        invitedUserNickname: '',
    },
    {
        events: {
            LOAD_MORE: () => ({}),

            SEARCH_USERS_BY_NICKNAME: (nickname: string) => ({ nickname }),

            INVITE_FOLLOWING: (nickname: string) => ({ nickname }),

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

const InviteFollowingEvent = z
    .object({
        nickname: z.string(),
    })
    .nonstrict();
type InviteFollowingEvent = z.infer<typeof InviteFollowingEvent>;

const InviteUserEvent = z
    .object({
        nickname: z.string(),
    })
    .nonstrict();
type InviteUserEvent = z.infer<typeof InviteUserEvent>;

const incrementFollowingPageToContext = mtvRoomUsersSearchModel.assign(
    {
        followingPage: ({ followingPage }) => followingPage + 1,
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

const assignInvitedFollowingNicknameToContext = mtvRoomUsersSearchModel.assign(
    {
        invitedFollowingNickname: (_, { nickname }) => nickname,
    },
    'INVITE_FOLLOWING',
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
    initial: 'followingView',

    states: {
        followingView: {
            initial: 'fetching',

            states: {
                fetching: {
                    meta: {
                        test: async (
                            { screen }: TestingContext,
                            {
                                context: { followingPage },
                            }: MtvRoomUsersSearchMachineState,
                        ) => {
                            for (const { nickname } of getPage(
                                fakeFollowing,
                                followingPage,
                                FOLLOWING_PAGE_LENGTH,
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
                        cond: ({ followingPage }) =>
                            followingPage === fakeFollowingPagesCount,

                        target: 'fetchedAllFollowing',
                    },

                    on: {
                        LOAD_MORE: {
                            actions: incrementFollowingPageToContext,
                        },

                        INVITE_FOLLOWING: {
                            target: 'invitedFollowing',

                            actions: assignInvitedFollowingNicknameToContext,
                        },
                    },
                },

                invitedFollowing: {
                    initial: 'firstFollowingInvitation',

                    states: {
                        firstFollowingInvitation: {
                            meta: {
                                test: async (
                                    {
                                        screen,
                                        creatorInviteUserMock,
                                    }: TestingContext,
                                    {
                                        context: { invitedFollowingNickname },
                                    }: MtvRoomUsersSearchMachineState,
                                ) => {
                                    const invitedFollowing = fakeFollowing.find(
                                        ({ nickname: followingNickname }) =>
                                            followingNickname ===
                                            invitedFollowingNickname,
                                    );
                                    if (invitedFollowing === undefined) {
                                        throw new Error(
                                            `Could not find a following with nickname: ${invitedFollowingNickname}`,
                                        );
                                    }

                                    await waitFor(() => {
                                        expect(
                                            creatorInviteUserMock,
                                        ).toHaveBeenNthCalledWith<
                                            [MtvRoomCreatorInviteUserArgs]
                                        >(1, {
                                            invitedUserID:
                                                invitedFollowing.userID,
                                        });
                                    });

                                    const followingCard = screen.getByTestId(
                                        `${invitedFollowingNickname}-user-card`,
                                    );
                                    expect(followingCard).toBeTruthy();

                                    await waitFor(() => {
                                        const invitedCheckMarkIcon =
                                            within(
                                                followingCard,
                                            ).getByA11yLabel(
                                                /has.*been.*invited/i,
                                            );
                                        expect(
                                            invitedCheckMarkIcon,
                                        ).toBeTruthy();
                                    });
                                },
                            },

                            on: {
                                INVITE_FOLLOWING: {
                                    target: 'secondFollowingInvitation',
                                },
                            },
                        },

                        secondFollowingInvitation: {
                            type: 'final',

                            meta: {
                                test: (
                                    { creatorInviteUserMock }: TestingContext,
                                    {
                                        context: { invitedFollowingNickname },
                                    }: MtvRoomUsersSearchMachineState,
                                ) => {
                                    const invitedFollowing = fakeFollowing.find(
                                        ({ nickname: followingNickname }) =>
                                            followingNickname ===
                                            invitedFollowingNickname,
                                    );
                                    if (invitedFollowing === undefined) {
                                        throw new Error(
                                            `Could not find a following with nickname: ${invitedFollowingNickname}`,
                                        );
                                    }

                                    expect(
                                        creatorInviteUserMock,
                                    ).toHaveBeenNthCalledWith<
                                        [MtvRoomCreatorInviteUserArgs]
                                    >(1, {
                                        invitedUserID: invitedFollowing.userID,
                                    });
                                },
                            },
                        },
                    },
                },

                fetchedAllFollowing: {
                    type: 'final',

                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            for (const { nickname } of getPage(
                                fakeFollowing,
                                fakeFollowingPagesCount,
                                FOLLOWING_PAGE_LENGTH,
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
                                fakeFollowingAndUsers,
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
                                fakeFollowingAndUsers,
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
                    initial: 'firstUserInvitation',

                    states: {
                        firstUserInvitation: {
                            meta: {
                                test: async (
                                    {
                                        screen,
                                        creatorInviteUserMock,
                                    }: TestingContext,
                                    {
                                        context: { invitedUserNickname },
                                    }: MtvRoomUsersSearchMachineState,
                                ) => {
                                    const invitedUser =
                                        fakeFollowingAndUsers.find(
                                            ({ nickname: followingNickname }) =>
                                                followingNickname ===
                                                invitedUserNickname,
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

                                    const userCard = screen.getByTestId(
                                        `${invitedUserNickname}-user-card`,
                                    );
                                    expect(userCard).toBeTruthy();

                                    await waitFor(() => {
                                        const invitedCheckMarkIcon =
                                            within(userCard).getByA11yLabel(
                                                /has.*been.*invited/i,
                                            );
                                        expect(
                                            invitedCheckMarkIcon,
                                        ).toBeTruthy();
                                    });
                                },
                            },

                            on: {
                                INVITE_USER: {
                                    target: 'secondUserInvitation',
                                },
                            },
                        },

                        secondUserInvitation: {
                            type: 'final',

                            meta: {
                                test: (
                                    { creatorInviteUserMock }: TestingContext,
                                    {
                                        context: { invitedUserNickname },
                                    }: MtvRoomUsersSearchMachineState,
                                ) => {
                                    const invitedUser =
                                        fakeFollowingAndUsers.find(
                                            ({ nickname: followingNickname }) =>
                                                followingNickname ===
                                                invitedUserNickname,
                                        );
                                    if (invitedUser === undefined) {
                                        throw new Error(
                                            `Could not find a user with nickname: ${invitedUserNickname}`,
                                        );
                                    }

                                    expect(
                                        creatorInviteUserMock,
                                    ).toHaveBeenNthCalledWith<
                                        [MtvRoomCreatorInviteUserArgs]
                                    >(1, {
                                        invitedUserID: invitedUser.userID,
                                    });
                                },
                            },
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
                                fakeFollowingAndUsers,
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

    INVITE_FOLLOWING: {
        exec: async ({ screen }, event) => {
            const { nickname } = InviteFollowingEvent.parse(event);

            const userCard = await screen.findByTestId(`${nickname}-user-card`);
            expect(userCard).toBeTruthy();
            expect(userCard).toHaveTextContent(nickname);

            fireEvent.press(userCard);
        },

        cases: [
            {
                nickname: fakeFollowing[0].nickname,
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

describe('Display following and search users', () => {
    const testPlans = mtvRoomUsersSearchTestingModel.getSimplePathPlansTo(
        (state) => {
            const { followingPage, invitedFollowingNickname } = state.context;

            const invitedOneUser = state.matches({
                usersView: { invitedUser: 'secondUserInvitation' },
            });
            if (invitedOneUser === true) {
                const didNotLoadMoreFollowing = followingPage === 1;
                const didNotInviteFollowing = invitedFollowingNickname === '';

                return didNotLoadMoreFollowing && didNotInviteFollowing;
            }

            /**
             * Go to final state of usersView after:
             * - do not fetching more following
             * - fetching all following
             */
            const displayedAllUsersForSearchQuery = state.matches({
                usersView: 'fetchedAllUsersForSearchQuery',
            });

            return (
                displayedAllUsersForSearchQuery === true &&
                (followingPage === 1 ||
                    followingPage === fakeFollowingPagesCount)
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

                    db.userFollowing.create({
                        userID: CLIENT_INTEG_TEST_USER_ID,
                        following: fakeFollowing.map((following) =>
                            db.searchableUsers.create(following),
                        ),
                    });

                    for (const fakeUser of fakeUsers) {
                        db.searchableUsers.create(fakeUser);
                    }

                    serverSocket.on('MTV_GET_CONTEXT', () => {
                        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
                    });

                    serverSocket.on('MTV_GET_USERS_LIST', (cb) => {
                        cb(fakeUsersArray);
                    });

                    const creatorInviteUserMock: jest.Mock<
                        void,
                        [MtvRoomCreatorInviteUserArgs]
                    > = jest.fn();

                    serverSocket.on(
                        'MTV_CREATOR_INVITE_USER',
                        creatorInviteUserMock,
                    );

                    const screen = await renderInviteUsers(initialState);

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

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    const screen = await renderApp();

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

test('Clearing search input displays users without filtering', async () => {
    const initialState = generateMtvWorklowState({
        userType: 'CREATOR',
    });
    const fakeUsersArray = getFakeUsersList({
        directMode: false,
        isMeIsCreator: true,
    });
    const followingNicknameToSearch = fakeFollowing[0].nickname;
    const userNicknameToSearch = fakeUsers[0].nickname;

    db.userFollowing.create({
        userID: CLIENT_INTEG_TEST_USER_ID,
        following: fakeFollowing.map((following) =>
            db.searchableUsers.create(following),
        ),
    });

    for (const fakeUser of fakeUsers) {
        db.searchableUsers.create(fakeUser);
    }

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    serverSocket.on('MTV_GET_USERS_LIST', (cb) => {
        cb(fakeUsersArray);
    });

    const screen = await renderInviteUsers(initialState);

    const [, searchUsersInput] = await screen.findAllByPlaceholderText(
        /search.*user.*by.*name/i,
    );
    expect(searchUsersInput).toBeTruthy();

    await waitFor(() => {
        const followingCard = screen.getByTestId(
            `${followingNicknameToSearch}-user-card`,
        );
        expect(followingCard).toBeTruthy();
    });

    const waitForFollowingCardToDisappearPromise = waitForElementToBeRemoved(
        () => screen.getByTestId(`${followingNicknameToSearch}-user-card`),
    );

    fireEvent(searchUsersInput, 'focus');
    fireEvent.changeText(searchUsersInput, userNicknameToSearch);

    await waitForFollowingCardToDisappearPromise;

    await waitFor(() => {
        const userCard = screen.getByTestId(
            `${userNicknameToSearch}-user-card`,
        );
        expect(userCard).toBeTruthy();
    });

    const waitForUserCardToDisappearPromise = waitForElementToBeRemoved(() =>
        screen.getByTestId(`${userNicknameToSearch}-user-card`),
    );

    const clearSearchInputButton =
        screen.getByLabelText(/clear.*search.*input/i);
    expect(clearSearchInputButton).toBeTruthy();

    fireEvent.press(clearSearchInputButton);

    await waitForUserCardToDisappearPromise;

    await waitFor(() => {
        const followingCard = screen.getByTestId(
            `${followingNicknameToSearch}-user-card`,
        );
        expect(followingCard).toBeTruthy();
    });
});

test('Cancelling search input displays users without filtering', async () => {
    const initialState = generateMtvWorklowState({
        userType: 'CREATOR',
    });
    const fakeUsersArray = getFakeUsersList({
        directMode: false,
        isMeIsCreator: true,
    });
    const followingNicknameToSearch = fakeFollowing[0].nickname;
    const userNicknameToSearch = fakeUsers[0].nickname;

    db.userFollowing.create({
        userID: CLIENT_INTEG_TEST_USER_ID,
        following: fakeFollowing.map((following) =>
            db.searchableUsers.create(following),
        ),
    });

    for (const fakeUser of fakeUsers) {
        db.searchableUsers.create(fakeUser);
    }

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    serverSocket.on('MTV_GET_USERS_LIST', (cb) => {
        cb(fakeUsersArray);
    });

    const screen = await renderInviteUsers(initialState);

    const [, searchUsersInput] = await screen.findAllByPlaceholderText(
        /search.*user.*by.*name/i,
    );
    expect(searchUsersInput).toBeTruthy();

    await waitFor(() => {
        const followingCard = screen.getByTestId(
            `${followingNicknameToSearch}-user-card`,
        );
        expect(followingCard).toBeTruthy();
    });

    const waitForFollowingCardToDisappearPromise = waitForElementToBeRemoved(
        () => screen.getByTestId(`${followingNicknameToSearch}-user-card`),
    );

    fireEvent(searchUsersInput, 'focus');
    fireEvent.changeText(searchUsersInput, userNicknameToSearch);

    await waitForFollowingCardToDisappearPromise;

    await waitFor(() => {
        const userCard = screen.getByTestId(
            `${userNicknameToSearch}-user-card`,
        );
        expect(userCard).toBeTruthy();
    });

    const waitForUserCardToDisappearPromise = waitForElementToBeRemoved(() =>
        screen.getByTestId(`${userNicknameToSearch}-user-card`),
    );

    const cancelButton = screen.getAllByText(/cancel/i).slice(-1)[0];
    expect(cancelButton).toBeTruthy();

    fireEvent.press(cancelButton);

    await waitForUserCardToDisappearPromise;

    await waitFor(() => {
        const followingCard = screen.getByTestId(
            `${followingNicknameToSearch}-user-card`,
        );
        expect(followingCard).toBeTruthy();
    });
});
