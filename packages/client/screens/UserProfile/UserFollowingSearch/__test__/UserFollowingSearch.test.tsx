import {
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    MtvRoomUsersListElement,
    UserSummary,
} from '@musicroom/types';
import { context, rest } from 'msw';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { datatype, internet } from 'faker';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import invariant from 'tiny-invariant';
import cases from 'jest-in-case';
import { ContextFrom, EventFrom, State } from 'xstate';
import { serverSocket } from '../../../../services/websockets';
import {
    render,
    renderApp,
    testGetFakeUserID,
} from '../../../../tests/tests-utils';
import { db, generateMtvWorklowState } from '../../../../tests/data';
import { server } from '../../../../tests/server/test-server';
import { SERVER_ENDPOINT } from '../../../../constants/Endpoints';

interface TestingContext {
    meUserSummary: UserSummary;
    searchedUserSummary: UserSummary;
    screen: ReturnType<typeof render> | undefined;
}

const RESULT_PER_PAGE = 10;

const searchUserFollowingModel = createModel(
    {},
    {
        events: {
            'Make API respond user not found and render application':
                () => ({}),
            'Make API respond user found and render application': () => ({}),
            'Make API respond forbidden exception and render application':
                () => ({}),
            'Load more following results': () => ({}),
            'fill searched user nickname query and submit': () => ({}),
            'fill my nickname and submit': () => ({}),
            'cancel search bar': () => ({}),
            'press an other user card': () => ({}),
            'press my user card': () => ({}),
        },
    },
);

const searchUserFollowingMachine = searchUserFollowingModel.createMachine({
    id: 'User following search engine',
    initial: 'Initializing',
    states: {
        Initializing: {
            meta: {
                test: ({ screen }: TestingContext) => {
                    expect(screen).toBeUndefined();
                },
            },
            on: {
                'Make API respond user not found and render application': {
                    target: '#User following search engine.User not found',
                },
                'Make API respond user found and render application': {
                    target: '#User following search engine.User found.User relations are viewable',
                },
                'Make API respond forbidden exception and render application': {
                    target: '#User following search engine.User found.User relations are forbidden',
                },
            },
        },

        'User not found': {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    invariant(
                        screen !== undefined,
                        'Screen must have been rendered before being in this state',
                    );

                    await waitFor(() => {
                        const userfollowingSearchContainer = screen.getByTestId(
                            `search-user-following-screen`,
                        );
                        expect(userfollowingSearchContainer).toBeTruthy();
                        const userNotFoundText = within(
                            userfollowingSearchContainer,
                        ).getByText(/User.*not.*found/i);
                        expect(userNotFoundText).toBeTruthy();
                    });
                },
            },
        },

        'User found': {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    invariant(
                        screen !== undefined,
                        'Screen must have been rendered before being in this state',
                    );

                    await waitFor(() => {
                        const userfollowingSearchContainer = screen.getByTestId(
                            `search-user-following-screen`,
                        );
                        expect(userfollowingSearchContainer).toBeTruthy();
                    });
                },
            },
            states: {
                'User relations are viewable': {
                    initial: 'first page is loaded on screen',
                    states: {
                        'first page is loaded on screen': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    invariant(
                                        screen !== undefined,
                                        'Screen must have been rendered before being in this state',
                                    );

                                    await waitFor(() => {
                                        const followingFlatList =
                                            screen.getByTestId(
                                                `user-following-search-flat-list`,
                                            );
                                        expect(followingFlatList).toBeTruthy();

                                        const userCards =
                                            within(
                                                followingFlatList,
                                            ).queryAllByTestId(/.*-user-card/);
                                        expect(userCards.length).toBe(
                                            1 * RESULT_PER_PAGE,
                                        );
                                    });
                                },
                            },
                        },

                        'second page is loaded on screen': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    invariant(
                                        screen !== undefined,
                                        'Screen must have been rendered before being in this state',
                                    );

                                    await waitFor(() => {
                                        const followingFlatList =
                                            screen.getByTestId(
                                                `user-following-search-flat-list`,
                                            );
                                        expect(followingFlatList).toBeTruthy();

                                        const userCards =
                                            within(
                                                followingFlatList,
                                            ).queryAllByTestId(/.*-user-card/);
                                        expect(userCards.length).toBe(
                                            2 * RESULT_PER_PAGE,
                                        );
                                    });
                                },
                            },
                        },

                        'filtered users list': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    invariant(
                                        screen !== undefined,
                                        'Screen must have been rendered before being in this state',
                                    );

                                    await waitFor(() => {
                                        const followingFlatList =
                                            screen.getByTestId(
                                                `user-following-search-flat-list`,
                                            );
                                        expect(followingFlatList).toBeTruthy();

                                        const userCards =
                                            within(
                                                followingFlatList,
                                            ).queryAllByTestId(/.*-user-card/);
                                        expect(userCards.length).toBe(1);
                                    });
                                },
                            },
                        },
                    },

                    on: {
                        'Load more following results': {
                            target: '.second page is loaded on screen',
                        },

                        'fill searched user nickname query and submit': {
                            target: '.filtered users list',
                        },

                        'fill my nickname and submit': {
                            target: '.filtered users list',
                        },

                        'cancel search bar': {
                            target: '.first page is loaded on screen',
                        },

                        'press my user card': {
                            target: '#User following search engine.pressed my user card',
                        },

                        'press an other user card': {
                            target: '#User following search engine.pressed an other user card',
                        },
                    },
                },

                'User relations are forbidden': {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'Screen must have been rendered before being in this state',
                            );

                            await waitFor(() => {
                                const forbiddenLabel =
                                    screen.getByText(/following.*forbidden/i);
                                expect(forbiddenLabel).toBeTruthy();
                            });
                        },
                    },
                },
            },
        },

        'pressed my user card': {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    invariant(
                        screen !== undefined,
                        'Screen must have been rendered before being in this state',
                    );

                    await waitFor(() => {
                        expect(
                            screen.getByTestId(
                                'default-my-profile-page-screen',
                            ),
                        ).toBeTruthy();
                    });
                },
            },
        },

        'pressed an other user card': {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    invariant(
                        screen !== undefined,
                        'Screen must have been rendered before being in this state',
                    );

                    await waitFor(() => {
                        expect(
                            screen.getByTestId('default-profile-page-screen'),
                        ).toBeTruthy();
                    });
                },
            },
        },
    },
});

//User events
const searchUserfollowingTestModel = createTestModel<TestingContext>(
    searchUserFollowingMachine,
).withEvents({
    'Make API respond user found and render application': async (context) => {
        //user exists route ?
        const { userID: meUserID, nickname: meUserNickname } =
            context.meUserSummary;
        const { nickname: searchedUserNickname, userID: searchedUserID } =
            context.searchedUserSummary;

        const following = [
            ...Array.from({ length: 21 }, () =>
                db.searchableUsers.create({
                    nickname: internet.userName(),
                    userID: datatype.uuid(),
                }),
            ),
            db.searchableUsers.create({
                nickname: searchedUserNickname,
                userID: searchedUserID,
            }),
            db.searchableUsers.create({
                nickname: meUserNickname,
                userID: meUserID,
            }),
        ];

        const famousUserID = datatype.uuid();
        db.userProfileInformation.create({
            userID: famousUserID,
            following: false,
            userNickname: internet.userName(),
            followingCounter: following.length,
            followersCounter: 0,
            playlistsCounter: undefined,
        });

        db.userFollowing.create({
            userID: famousUserID,
            following,
        });

        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID: famousUserID,
        });
        await goToUserfollowingScreen({
            screen,
            expectedFollowingCounter: following.length,
        });
        context.screen = screen;
    },
    'Make API respond user not found and render application': async (
        context,
    ) => {
        const { userID, nickname: userNickname } = context.meUserSummary;
        db.userProfileInformation.create({
            userID,
            following: false,
            userNickname,
            followingCounter: 1,
            followersCounter: 0,
            playlistsCounter: undefined,
        });

        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID,
        });

        //The following mock has to stay here we need the default one inside goToUserProfileThroughMusicTrackVoteRoom function
        server.use(
            rest.post<
                GetUserProfileInformationRequestBody,
                Record<string, never>,
                GetUserProfileInformationResponseBody
            >(
                `${SERVER_ENDPOINT}/user/profile-information`,
                (_req, res, ctx) => {
                    return res(ctx.status(404));
                },
            ),
        );
        await goToUserfollowingScreen({ screen, expectedFollowingCounter: 1 });
        context.screen = screen;
    },
    'Make API respond forbidden exception and render application': async (
        context,
    ) => {
        const { nickname: userNickname, userID } = context.meUserSummary;
        db.userProfileInformation.create({
            userID,
            following: false,
            userNickname,
            followingCounter: 1,
            followersCounter: 0,
            playlistsCounter: undefined,
        });
        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID,
        });

        //The following mock has to stay here we need the default one inside goToUserProfileThroughMusicTrackVoteRoom function
        server.use(
            rest.post<
                GetUserProfileInformationRequestBody,
                Record<string, never>,
                GetUserProfileInformationResponseBody
            >(
                `${SERVER_ENDPOINT}/user/profile-information`,
                (_req, res, ctx) => {
                    return res(
                        ctx.json({
                            userID,
                            following: false,
                            userNickname,
                            followingCounter: undefined,
                            followersCounter: undefined,
                            playlistsCounter: undefined,
                        }),
                    );
                },
            ),
        );
        await goToUserfollowingScreen({ screen, expectedFollowingCounter: 1 });
        context.screen = screen;
    },
    'Load more following results': async (context) => {
        const { screen } = context;
        invariant(screen !== undefined, 'screen should be init');

        const loadMoreButton = await screen.findByText(/load.*more/i);
        expect(loadMoreButton).toBeTruthy();

        fireEvent.press(loadMoreButton);
    },
    'fill searched user nickname query and submit': async (context, e) => {
        const {
            screen,
            searchedUserSummary: { nickname },
        } = context;
        invariant(screen !== undefined, 'screen should be init');

        const searchFollowingTextField = (
            await screen.findAllByPlaceholderText(/search.*following/i)
        ).slice(-1)[0];
        expect(searchFollowingTextField).toBeTruthy();
        fireEvent(searchFollowingTextField, 'focus');
        fireEvent.changeText(searchFollowingTextField, nickname);
        fireEvent(searchFollowingTextField, 'submitEditing');
    },
    'fill my nickname and submit': async ({
        screen,
        meUserSummary: { nickname },
    }) => {
        invariant(screen !== undefined, 'screen should be init');

        const searchFollowingTextField = (
            await screen.findAllByPlaceholderText(/search.*following/i)
        ).slice(-1)[0];
        expect(searchFollowingTextField).toBeTruthy();
        fireEvent(searchFollowingTextField, 'focus');
        fireEvent.changeText(searchFollowingTextField, nickname);
        fireEvent(searchFollowingTextField, 'submitEditing');
    },
    'cancel search bar': (context) => {
        const { screen } = context;
        invariant(screen !== undefined, 'screen should be init');
        const userfollowingSearchContainer = screen.getByTestId(
            `search-user-following-screen`,
        );
        expect(userfollowingSearchContainer).toBeTruthy();
        const cancelButton = within(userfollowingSearchContainer).getByText(
            /cancel/i,
        );
        expect(cancelButton).toBeTruthy();

        fireEvent.press(cancelButton);
    },
    'press an other user card': ({
        screen,
        searchedUserSummary: { nickname },
    }) => {
        invariant(screen !== undefined, 'screen should be init');

        const followingFlatList = screen.getByTestId(
            `user-following-search-flat-list`,
        );
        expect(followingFlatList).toBeTruthy();

        const searchedUserCard = within(followingFlatList).getByText(nickname);
        expect(searchedUserCard).toBeTruthy();
        fireEvent.press(searchedUserCard);
    },
    'press my user card': ({ screen, meUserSummary: { nickname } }) => {
        invariant(screen !== undefined, 'screen should be init');

        const followingFlatList = screen.getByTestId(
            `user-following-search-flat-list`,
        );
        expect(followingFlatList).toBeTruthy();

        const myUserCard = within(followingFlatList).getByText(nickname);
        expect(myUserCard).toBeTruthy();
        fireEvent.press(myUserCard);
    },
});

cases<{
    events: EventFrom<typeof searchUserFollowingModel>[];
    target:
        | {
              'User found':
                  | 'User relations are viewable'
                  | 'User relations are forbidden';
          }
        | 'User not found';
}>(
    'user following search tests',
    async ({ events, target }) => {
        const plan = searchUserfollowingTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({
            meUserSummary: {
                nickname: internet.userName(),
                userID: testGetFakeUserID(),
            },
            searchedUserSummary: {
                nickname: internet.userName(),
                userID: datatype.uuid(),
            },
            screen: undefined,
        });
    },
    {
        // User found and relations are viewable
        'Make API respond user found and render application': {
            events: [
                searchUserFollowingModel.events[
                    'Make API respond user found and render application'
                ](),
            ],
            target: {
                'User found': 'User relations are viewable',
            },
        },

        //User not found
        'Make API respond user not found and render application': {
            events: [
                searchUserFollowingModel.events[
                    'Make API respond user not found and render application'
                ](),
            ],
            target: 'User not found',
        },

        'Make API respond forbidden exception and render application': {
            events: [
                searchUserFollowingModel.events[
                    'Make API respond forbidden exception and render application'
                ](),
            ],
            target: {
                'User found': 'User relations are forbidden',
            },
        },
    },
);

cases<{
    events: EventFrom<typeof searchUserFollowingModel>[];
    target:
        | {
              'User found': {
                  'User relations are viewable': 'first page is loaded on screen';
              };
          }
        | 'pressed my user card'
        | 'pressed an other user card';
}>(
    'user following deep search tests',
    async ({ events, target }) => {
        const plan = searchUserfollowingTestModel.getPlanFromEvents(events, {
            target,
        });
        const meUserSummary = {
            nickname: internet.userName(),
            userID: testGetFakeUserID(),
        };
        const searchedUserSummary = {
            nickname: internet.userName(),
            userID: datatype.uuid(),
        };

        await plan.test({
            meUserSummary,
            searchedUserSummary,
            screen: undefined,
        });
    },
    {
        // User found and relations are viewable
        'User found data viewable, load more filter and cancel filter': {
            events: [
                searchUserFollowingModel.events[
                    'Make API respond user found and render application'
                ](),
                searchUserFollowingModel.events[
                    'Load more following results'
                ](),
                searchUserFollowingModel.events[
                    'fill searched user nickname query and submit'
                ](),
                searchUserFollowingModel.events['cancel search bar'](),
            ],
            target: {
                'User found': {
                    'User relations are viewable':
                        'first page is loaded on screen',
                },
            },
        },

        'User foud data viewable, user presses his own user card': {
            events: [
                searchUserFollowingModel.events[
                    'Make API respond user found and render application'
                ](),
                searchUserFollowingModel.events[
                    'fill my nickname and submit'
                ](),
                searchUserFollowingModel.events['press my user card'](),
            ],
            target: 'pressed my user card',
        },

        'User foud data viewable, user presses other user card': {
            events: [
                searchUserFollowingModel.events[
                    'Make API respond user found and render application'
                ](),
                searchUserFollowingModel.events[
                    'fill searched user nickname query and submit'
                ](),
                searchUserFollowingModel.events['press an other user card'](),
            ],
            target: 'pressed an other user card',
        },
    },
);

async function goToUserProfileThroughMusicTrackVoteRoom({
    userID,
}: {
    userID: string;
}): Promise<ReturnType<typeof render>> {
    const userNickname = internet.userName();
    const roomCreatorUserID = datatype.uuid();
    const initialState = generateMtvWorklowState({
        userType: 'CREATOR',
    });

    const fakeUsersArray: MtvRoomUsersListElement[] = [
        {
            hasControlAndDelegationPermission: true,
            isCreator: true,
            isDelegationOwner: true,
            isMe: true,
            nickname: internet.userName(),
            userID: roomCreatorUserID,
        },
        {
            hasControlAndDelegationPermission: false,
            isCreator: false,
            isDelegationOwner: false,
            isMe: false,
            nickname: userNickname,
            userID,
        },
    ];
    //Going to user page profile via mtv user list screen

    serverSocket.on('MTV_GET_CONTEXT', () => {
        serverSocket.emit('MTV_RETRIEVE_CONTEXT', initialState);
    });

    serverSocket.on('MTV_GET_USERS_LIST', (cb) => {
        cb(fakeUsersArray);
    });

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const musicPlayerMini = screen.getByTestId('music-player-mini');
    expect(musicPlayerMini).toBeTruthy();

    fireEvent.press(musicPlayerMini);

    const musicPlayerFullScreen = await screen.findByA11yState({
        expanded: true,
    });
    expect(musicPlayerFullScreen).toBeTruthy();

    const listenersButton = await screen.getByText(/listeners/i);
    expect(listenersButton).toBeTruthy();

    fireEvent.press(listenersButton);

    const userCardElement = await waitFor(() => {
        const userCardElement = screen.getByTestId(`${userNickname}-user-card`);
        expect(userCardElement).toBeTruthy();
        return userCardElement;
    });

    fireEvent.press(userCardElement);

    await waitFor(() => {
        const profileScreen = screen.getByTestId(
            `${userID}-profile-page-screen`,
        );
        expect(profileScreen).toBeTruthy();
    });

    return screen;
}

async function goToUserfollowingScreen({
    screen,
    expectedFollowingCounter,
}: {
    screen: ReturnType<typeof render>;
    expectedFollowingCounter: number;
}): Promise<void> {
    const followingCounter = screen.getByText(
        new RegExp(`following.*${expectedFollowingCounter}`),
    );
    fireEvent.press(followingCounter);

    await waitFor(() => {
        expect(screen.getByTestId('search-user-following-screen')).toBeTruthy();
    });
}
