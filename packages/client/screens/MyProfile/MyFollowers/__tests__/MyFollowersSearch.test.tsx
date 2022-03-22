import {
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UserSummary,
} from '@musicroom/types';
import { rest } from 'msw';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { datatype, internet } from 'faker';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import invariant from 'tiny-invariant';
import cases from 'jest-in-case';
import { EventFrom } from 'xstate';
import {
    render,
    renderApp,
    CLIENT_INTEG_TEST_USER_ID,
} from '../../../../tests/tests-utils';
import { db } from '../../../../tests/data';
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
            'User goes to his followers search screen': () => ({}),
            'Load more followers results': () => ({}),
            'fill searched user nickname query and submit': () => ({}),
            'cancel search bar': () => ({}),
            'press an other user card': () => ({}),
        },
    },
);

const searchUserFollowerMachine = searchUserFollowerModel.createMachine({
    id: 'My followers search engine',
    initial: 'Initializing',
    states: {
        Initializing: {
            meta: {
                test: ({ screen }: TestingContext) => {
                    expect(screen).toBeUndefined();
                },
            },
            on: {
                'User goes to his followers search screen': {
                    target: '#My followers search engine.My followers search screen',
                },
            },
        },

        'My followers search screen': {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    invariant(
                        screen !== undefined,
                        'Screen must have been rendered before being in this state',
                    );

                    await waitFor(() => {
                        const myFollowersSearchContainer = screen.getByTestId(
                            `search-my-followers-screen`,
                        );
                        expect(myFollowersSearchContainer).toBeTruthy();
                    });
                },
            },
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
                                const followersFlatList = screen.getByTestId(
                                    `my-followers-search-flat-list`,
                                );
                                expect(followersFlatList).toBeTruthy();

                                const userCards =
                                    within(followersFlatList).queryAllByTestId(
                                        /.*-user-card/,
                                    );
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
                                const followersFlatList = screen.getByTestId(
                                    `my-followers-search-flat-list`,
                                );
                                expect(followersFlatList).toBeTruthy();

                                const userCards =
                                    within(followersFlatList).queryAllByTestId(
                                        /.*-user-card/,
                                    );
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
                                const followersFlatList = screen.getByTestId(
                                    `my-followers-search-flat-list`,
                                );
                                expect(followersFlatList).toBeTruthy();

                                const userCards =
                                    within(followersFlatList).queryAllByTestId(
                                        /.*-user-card/,
                                    );
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

                'cancel search bar': {
                    target: '.first page is loaded on screen',
                },

                'press an other user card': {
                    target: '#My followers search engine.pressed an other user card',
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
    'User goes to his followers search screen': async (context) => {
        const { userID: meUserID, nickname: meUserNickname } =
            context.meUserSummary;
        const { nickname: searchedUserNickname, userID: searchedUserID } =
            context.searchedUserSummary;

        const myFollowers = [
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

        db.myProfileInformation.create({
            userID: meUserID,
            userNickname: meUserNickname,
            followersCounter: myFollowers.length,
            followingCounter: 0,
            playlistsCounter: 0,
            devicesCounter: 1,
            hasConfirmedEmail: true,
        });

        db.userFollowers.create({
            userID: meUserID,
            followers: myFollowers,
        });

        const screen = await goToMyProfileScreen();
        goToMyFollowersScreen({
            screen,
            expectedFollowersCounter: myFollowers.length,
        });
        context.screen = screen;
    },
    'Make API respond user not found and render application': async (
        context,
    ) => {
        const { userID, nickname: userNickname } = context.meUserSummary;
        db.myProfileInformation.create({
            userID,
            userNickname,
            followersCounter: 1,
            followingCounter: 0,
            playlistsCounter: 0,
            hasConfirmedEmail: true,
        });

        const screen = await goToMyProfileScreen();

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
        goToMyFollowersScreen({ screen, expectedFollowersCounter: 1 });
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
            `search-my-followers-screen`,
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
            `my-followers-search-flat-list`,
        );
        expect(followersFlatList).toBeTruthy();

        const searchedUserCard = within(followersFlatList).getByText(nickname);
        expect(searchedUserCard).toBeTruthy();
        fireEvent.press(searchedUserCard);
    },
    'press my user card': ({ screen, meUserSummary: { nickname } }) => {
        invariant(screen !== undefined, 'screen should be init');

        const followersFlatList = screen.getByTestId(
            `my-followers-search-flat-list`,
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
              'My followers search screen': 'first page is loaded on screen';
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
        'User goes to his followers search screen': {
            events: [
                searchUserFollowerModel.events[
                    'User goes to his followers search screen'
                ](),
            ],
            target: {
                'My followers search screen': 'first page is loaded on screen',
            },
        },
    },
);

cases<{
    events: EventFrom<typeof searchUserFollowerModel>[];

    target:
        | {
              'My followers search screen': 'first page is loaded on screen';
          }
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
        // My followers search screen and relations are viewable
        'My followers search screen data viewable, load more filter and cancel filter':
            {
                events: [
                    searchUserFollowerModel.events[
                        'User goes to his followers search screen'
                    ](),
                    searchUserFollowerModel.events[
                        'Load more followers results'
                    ](),
                    searchUserFollowerModel.events[
                        'fill searched user nickname query and submit'
                    ](),
                    searchUserFollowerModel.events['cancel search bar'](),
                ],
                target: {
                    'My followers search screen':
                        'first page is loaded on screen',
                },
            },

        'User foud data viewable, user presses other user card': {
            events: [
                searchUserFollowerModel.events[
                    'User goes to his followers search screen'
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

async function goToMyProfileScreen(): Promise<ReturnType<typeof render>> {
    const screen = await renderApp();

    const myProfileButton = screen.getByTestId('open-my-profile-page-button');
    expect(myProfileButton).toBeTruthy();

    fireEvent.press(myProfileButton);

    await waitFor(() => {
        expect(screen.getByTestId('my-profile-page-container')).toBeTruthy();
    });

    return screen;
}

function goToMyFollowersScreen({
    screen,
    expectedFollowersCounter,
}: {
    screen: ReturnType<typeof render>;
    expectedFollowersCounter: number;
}): void {
    const followersCounter = screen.getByText(
        new RegExp(`followers.*${expectedFollowersCounter}`),
    );
    fireEvent.press(followersCounter);
}
