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
import { render, renderApp } from '../../../../tests/tests-utils';
import { db, generateMtvWorklowState } from '../../../../tests/data';
import { server } from '../../../../tests/server/test-server';
import { SERVER_ENDPOINT } from '../../../../constants/Endpoints';

interface TestingContext {
    meUserSummary: UserSummary;
    searchedUserSummary: UserSummary;
    screen: ReturnType<typeof render> | undefined;
}

const RESULT_PER_PAGE = 10;

type SearchUserFollowerMachineState = State<
    ContextFrom<typeof searchUserFollowerModel>,
    EventFrom<typeof searchUserFollowerModel>
>;

const searchUserFollowerModel = createModel(
    {
        page: 1 as number,
    },
    {
        events: {
            'Make API respond user not found and render application':
                () => ({}),
            'Make API respond user found and render application': () => ({}),
            'Make API respond forbidden exception and render application':
                () => ({}),
            'Load more followers results': () => ({}),
            'fill a search query and submit': () => ({}),
            'cancel search bar': () => ({}),
            'press an other user card': () => ({}),
            'press my user card': () => ({}),
        },
    },
);

const assignIncrPage = searchUserFollowerModel.assign(
    {
        page: ({ page }) => page + 1,
    },
    'Load more followers results',
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
                    initial: 'check user card per page on screen',
                    states: {
                        'check user card per page on screen': {
                            meta: {
                                test: async (
                                    { screen }: TestingContext,
                                    {
                                        context: { page },
                                    }: SearchUserFollowerMachineState,
                                ) => {
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
                                            page * RESULT_PER_PAGE,
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
                            target: '.check user card per page on screen',
                            actions: assignIncrPage,
                        },
                        'fill a search query and submit': {
                            target: '.filtered users list',
                            actions: searchUserFollowerModel.assign({
                                page: () => 1,
                            }),
                        },

                        'cancel search bar': {
                            target: '.check user card per page on screen',
                            actions: searchUserFollowerModel.assign({
                                page: () => 1,
                            }),
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
        ];

        db.userProfileInformation.create({
            userID: meUserID,
            following: false,
            userNickname: meUserNickname,
            followersCounter: followers.length,
            followingCounter: 0,
            playlistsCounter: undefined,
        });

        db.userFollowers.create({
            userID: meUserID,
            followers,
        });

        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID: meUserID,
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
                (_req, res, ctx) => {
                    return res(ctx.status(404));
                },
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
                (_req, res, ctx) => {
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
                },
            ),
        );
        await goToUserFollowersScreen({ screen, expectedFollowersCounter: 1 });
        context.screen = screen;
    },
    'Load more followers results': (context) => {
        const { screen } = context;
        invariant(screen !== undefined, 'screen should be init');

        screen.getByText(/load.*more/i);
        const loadMoreButton = screen.getByText(/load.*more/i);
        expect(loadMoreButton).toBeTruthy();

        fireEvent.press(loadMoreButton);
    },
    'fill a search query and submit': async (context) => {
        const { searchedUserSummary, screen } = context;
        invariant(screen !== undefined, 'screen should be init');

        const searchFollowerTextField = (
            await screen.findAllByPlaceholderText(/search.*follower/i)
        ).slice(-1)[0];
        expect(searchFollowerTextField).toBeTruthy();
        fireEvent(searchFollowerTextField, 'focus');
        fireEvent.changeText(
            searchFollowerTextField,
            searchedUserSummary.nickname,
        );
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
    'press user card': ({ screen }) => {
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
});

// cases<{
//     events: EventFrom<typeof searchUserFollowerModel>[];
//     target: any;
// }>(
//     'user followers search tests',
//     async ({ events, target }) => {
//         const userID = datatype.uuid();
//         const plan = searchUserFollowersTestModel.getPlanFromEvents(events, {
//             target,
//         });

//         await plan.test({
//             meUserSummary: {
//                 nickname: internet.userName(),
//                 userID: datatype.uuid(),
//             },
//             searchedUserSummary: {
//                 nickname: internet.userName(),
//                 userID: datatype.uuid(),
//             },
//             screen: undefined,
//         });
//     },
//     {
//         // User found and relations are viewable
//         'Make API respond user found and render application': {
//             events: [
//                 searchUserFollowerModel.events[
//                     'Make API respond user found and render application'
//                 ](),
//             ],
//             target: {
//                 'User found': 'User relations are viewable',
//             },
//         },

//         //User not found
//         'Make API respond user not found and render application': {
//             events: [
//                 searchUserFollowerModel.events[
//                     'Make API respond user not found and render application'
//                 ](),
//             ],
//             target: 'User not found',
//         },

//         'Make API respond forbidden exception and render application': {
//             events: [
//                 searchUserFollowerModel.events[
//                     'Make API respond forbidden exception and render application'
//                 ](),
//             ],
//             target: {
//                 'User found': 'User relations are forbidden',
//             },
//         },
//     },
// );

cases<{
    events: EventFrom<typeof searchUserFollowerModel>[];
    target: any;
}>(
    'user followers deep search tests',
    async ({ events, target }) => {
        const plan = searchUserFollowersTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({
            meUserSummary: {
                nickname: internet.userName(),
                userID: datatype.uuid(),
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
        'User found data viewable, load more filter and cancel filter': {
            events: [
                searchUserFollowerModel.events[
                    'Make API respond user found and render application'
                ](),
                searchUserFollowerModel.events['Load more followers results'](),
                searchUserFollowerModel.events[
                    'fill a search query and submit'
                ](),
                searchUserFollowerModel.events['cancel search bar'](),
            ],
            target: {
                'User found': {
                    'User relations are viewable':
                        'check user card per page on screen',
                },
            },
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
