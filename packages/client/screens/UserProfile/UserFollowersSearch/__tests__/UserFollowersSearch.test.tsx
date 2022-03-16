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
    CLIENT_INTEG_TEST_USER_ID,
} from '../../../../tests/tests-utils';
import { db, generateMtvWorklowState } from '../../../../tests/data';
import { server } from '../../../../tests/server/test-server';
import { SERVER_ENDPOINT } from '../../../../constants/Endpoints';
import { withAuthentication } from '../../../../tests/server/handlers';

interface TestingContext {
    meUserSummary: UserSummary;
    searchedUserSummary: UserSummary;
    screen: ReturnType<typeof render> | undefined;
}

const RESULT_PER_PAGE = 10;

const searchUserFollowerModel = createModel(
    {},
    {
        events: {
            'Make API respond user not found and render application':
                () => ({}),
            'Make API respond user found and render application': () => ({}),
            'Make API respond forbidden exception and render application':
                () => ({}),
            'Load more followers results': () => ({}),
            'fill searched user nickname query and submit': () => ({}),
            'fill my nickname and submit': () => ({}),
            'cancel search bar': () => ({}),
            'press an other user card': () => ({}),
            'press my user card': () => ({}),
        },
    },
);

const searchUserFollowerMachine = searchUserFollowerModel.createMachine({
    id: 'User followers search engine',
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
                    target: '#User followers search engine.User not found',
                },
                'Make API respond user found and render application': {
                    target: '#User followers search engine.User found.User relations are viewable',
                },
                'Make API respond forbidden exception and render application': {
                    target: '#User followers search engine.User found.User relations are forbidden',
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
                        const userFollowersSearchContainer = screen.getByTestId(
                            `search-user-followers-screen`,
                        );
                        expect(userFollowersSearchContainer).toBeTruthy();
                        const userNotFoundText = within(
                            userFollowersSearchContainer,
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
                        const userFollowersSearchContainer = screen.getByTestId(
                            `search-user-followers-screen`,
                        );
                        expect(userFollowersSearchContainer).toBeTruthy();
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
                                        const followersFlatList =
                                            screen.getByTestId(
                                                `user-followers-search-flat-list`,
                                            );
                                        expect(followersFlatList).toBeTruthy();

                                        const userCards =
                                            within(
                                                followersFlatList,
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
                                        const followersFlatList =
                                            screen.getByTestId(
                                                `user-followers-search-flat-list`,
                                            );
                                        expect(followersFlatList).toBeTruthy();

                                        const userCards =
                                            within(
                                                followersFlatList,
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
                                        const followersFlatList =
                                            screen.getByTestId(
                                                `user-followers-search-flat-list`,
                                            );
                                        expect(followersFlatList).toBeTruthy();

                                        const userCards =
                                            within(
                                                followersFlatList,
                                            ).queryAllByTestId(/.*-user-card/);
                                        expect(userCards.length).toBe(1);
                                    });
                                },
                            },
                        },
                    },

                    on: {
                        'Load more followers results': {
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
                            target: '#User followers search engine.pressed my user card',
                        },

                        'press an other user card': {
                            target: '#User followers search engine.pressed an other user card',
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
                                    screen.getByText(/followers.*forbidden/i);
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
const searchUserFollowersTestModel = createTestModel<TestingContext>(
    searchUserFollowerMachine,
).withEvents({
    'Make API respond user found and render application': async (context) => {
        //user exists route ?
        const { userID: meUserID, nickname: meUserNickname } =
            context.meUserSummary;
        const { nickname: searchedUserNickname, userID: searchedUserID } =
            context.searchedUserSummary;

        const followers = [
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
            followersCounter: followers.length,
            followingCounter: 0,
            playlistsCounter: undefined,
        });

        db.userFollowers.create({
            userID: famousUserID,
            followers,
        });

        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID: famousUserID,
        });
        await goToUserFollowersScreen({
            screen,
            expectedFollowersCounter: followers.length,
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
            followersCounter: 1,
            followingCounter: 0,
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
                withAuthentication((_req, res, ctx) => {
                    return res(ctx.status(404));
                }),
            ),
        );
        await goToUserFollowersScreen({ screen, expectedFollowersCounter: 1 });
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
            followersCounter: 1,
            followingCounter: 0,
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
                withAuthentication((_req, res, ctx) => {
                    return res(
                        ctx.json({
                            userID,
                            following: false,
                            userNickname,
                            followersCounter: undefined,
                            followingCounter: undefined,
                            playlistsCounter: undefined,
                        }),
                    );
                }),
            ),
        );
        await goToUserFollowersScreen({ screen, expectedFollowersCounter: 1 });
        context.screen = screen;
    },
    'Load more followers results': async (context) => {
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

        const searchFollowerTextField = (
            await screen.findAllByPlaceholderText(/search.*follower/i)
        ).slice(-1)[0];
        expect(searchFollowerTextField).toBeTruthy();
        fireEvent(searchFollowerTextField, 'focus');
        fireEvent.changeText(searchFollowerTextField, nickname);
        fireEvent(searchFollowerTextField, 'submitEditing');
    },
    'fill my nickname and submit': async ({
        screen,
        meUserSummary: { nickname },
    }) => {
        invariant(screen !== undefined, 'screen should be init');

        const searchFollowerTextField = (
            await screen.findAllByPlaceholderText(/search.*follower/i)
        ).slice(-1)[0];
        expect(searchFollowerTextField).toBeTruthy();
        fireEvent(searchFollowerTextField, 'focus');
        fireEvent.changeText(searchFollowerTextField, nickname);
        fireEvent(searchFollowerTextField, 'submitEditing');
    },
    'cancel search bar': (context) => {
        const { screen } = context;
        invariant(screen !== undefined, 'screen should be init');
        const userFollowersSearchContainer = screen.getByTestId(
            `search-user-followers-screen`,
        );
        expect(userFollowersSearchContainer).toBeTruthy();
        const cancelButton = within(userFollowersSearchContainer).getByText(
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

        const followersFlatList = screen.getByTestId(
            `user-followers-search-flat-list`,
        );
        expect(followersFlatList).toBeTruthy();

        const searchedUserCard = within(followersFlatList).getByText(nickname);
        expect(searchedUserCard).toBeTruthy();
        fireEvent.press(searchedUserCard);
    },
    'press my user card': ({ screen, meUserSummary: { nickname } }) => {
        invariant(screen !== undefined, 'screen should be init');

        const followersFlatList = screen.getByTestId(
            `user-followers-search-flat-list`,
        );
        expect(followersFlatList).toBeTruthy();

        const myUserCard = within(followersFlatList).getByText(nickname);
        expect(myUserCard).toBeTruthy();
        fireEvent.press(myUserCard);
    },
});

cases<{
    events: EventFrom<typeof searchUserFollowerModel>[];
    target:
        | {
              'User found':
                  | 'User relations are viewable'
                  | 'User relations are forbidden';
          }
        | 'User not found';
}>(
    'user followers search tests',
    async ({ events, target }) => {
        const plan = searchUserFollowersTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({
            meUserSummary: {
                nickname: internet.userName(),
                userID: CLIENT_INTEG_TEST_USER_ID,
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
                searchUserFollowerModel.events[
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
                searchUserFollowerModel.events[
                    'Make API respond user not found and render application'
                ](),
            ],
            target: 'User not found',
        },

        'Make API respond forbidden exception and render application': {
            events: [
                searchUserFollowerModel.events[
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
    events: EventFrom<typeof searchUserFollowerModel>[];

    target:
        | {
              'User found': {
                  'User relations are viewable': 'first page is loaded on screen';
              };
          }
        | 'pressed my user card'
        | 'pressed an other user card';
}>(
    'user followers deep search tests',
    async ({ events, target }) => {
        const plan = searchUserFollowersTestModel.getPlanFromEvents(events, {
            target,
        });
        const meUserSummary = {
            nickname: internet.userName(),
            userID: CLIENT_INTEG_TEST_USER_ID,
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
                searchUserFollowerModel.events[
                    'Make API respond user found and render application'
                ](),
                searchUserFollowerModel.events['Load more followers results'](),
                searchUserFollowerModel.events[
                    'fill searched user nickname query and submit'
                ](),
                searchUserFollowerModel.events['cancel search bar'](),
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
                searchUserFollowerModel.events[
                    'Make API respond user found and render application'
                ](),
                searchUserFollowerModel.events['fill my nickname and submit'](),
                searchUserFollowerModel.events['press my user card'](),
            ],
            target: 'pressed my user card',
        },

        'User foud data viewable, user presses other user card': {
            events: [
                searchUserFollowerModel.events[
                    'Make API respond user found and render application'
                ](),
                searchUserFollowerModel.events[
                    'fill searched user nickname query and submit'
                ](),
                searchUserFollowerModel.events['press an other user card'](),
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

async function goToUserFollowersScreen({
    screen,
    expectedFollowersCounter,
}: {
    screen: ReturnType<typeof render>;
    expectedFollowersCounter: number;
}): Promise<void> {
    const followersCounter = screen.getByText(
        new RegExp(`followers.*${expectedFollowersCounter}`),
    );
    fireEvent.press(followersCounter);

    await waitFor(() => {
        expect(screen.getByTestId('search-user-followers-screen')).toBeTruthy();
    });
}
