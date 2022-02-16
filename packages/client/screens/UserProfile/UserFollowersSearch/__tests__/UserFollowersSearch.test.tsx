import {
    ListUserFollowersRequestBody,
    ListUserFollowersResponseBody,
    MtvRoomUsersListElement,
} from '@musicroom/types';
import { rest } from 'msw';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { datatype, internet } from 'faker';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import invariant from 'tiny-invariant';
import cases from 'jest-in-case';
import { EventFrom } from 'xstate';
import { serverSocket } from '../../../../services/websockets';
import { render, renderApp } from '../../../../tests/tests-utils';
import { db, generateMtvWorklowState } from '../../../../tests/data';
import { server } from '../../../../tests/server/test-server';
import { SERVER_ENDPOINT } from '../../../../constants/Endpoints';

interface TestingContext {
    screen: ReturnType<typeof render> | undefined;
}

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
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'Screen must have been rendered before being in this state',
                            );

                            await waitFor(() => {
                                const followersFlatList = screen.getByTestId(
                                    `user-followers-search-flat-list`,
                                );
                                expect(followersFlatList).toBeTruthy();

                                const userCards =
                                    within(followersFlatList).queryAllByTestId(
                                        /.*-user-card/,
                                    );
                                expect(userCards.length).toBe(10);
                            });
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
                                    screen.getByText(/Forbidden/i);
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
        const userID = datatype.uuid();
        const followers = Array.from({ length: 21 }, () =>
            db.searchableUsers.create({
                nickname: internet.userName(),
                userID: datatype.uuid(),
            }),
        );

        db.userFollowers.create({
            userID,
            followers,
        });

        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID,
        });
        context.screen = screen;
    },
    'Make API respond user not found and render application': async (
        context,
    ) => {
        server.use(
            rest.post<
                ListUserFollowersRequestBody,
                Record<string, never>,
                ListUserFollowersResponseBody
            >(`${SERVER_ENDPOINT}/me/settings`, (req, res, ctx) => {
                return res(ctx.status(404));
            }),
        );
        //user exists route ?
        const userID = datatype.uuid();
        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID,
        });
        context.screen = screen;
    },
    'Make API respond forbidden exception and render application': async (
        context,
    ) => {
        server.use(
            rest.post<
                ListUserFollowersRequestBody,
                Record<string, never>,
                ListUserFollowersResponseBody
            >(`${SERVER_ENDPOINT}/me/settings`, (req, res, ctx) => {
                return res(ctx.status(403));
            }),
        );
        //user exists route ?
        const userID = datatype.uuid();
        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID,
        });
        context.screen = screen;
    },
    'Load more followers results': ({ screen }) => {
        invariant(screen !== undefined, 'screen should be init');

        screen.getByText(/load.*more/i);
        const loadMoreButton = screen.getByText(/load.*more/i);
        expect(loadMoreButton).toBeTruthy();

        fireEvent.press(loadMoreButton);
    },
});

cases<{
    events: EventFrom<typeof searchUserFollowerModel>[];
    target: any;
}>(
    'user followers search tests',
    async ({ events, target }) => {
        const plan = searchUserFollowersTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({
            screen: undefined,
        });
    },
    {
        //User found and relations are viewable
        // IS THIS LINE THE TEST NAME ?
        'Make API respond user found instantly and render application': {
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
        'Make API respond user not found instantly and render application': {
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

async function goToUserProfileThroughMusicTrackVoteRoom({
    userID,
}: {
    userID: string;
}): Promise<ReturnType<typeof render>> {
    const userNickname = internet.userName();
    db.userProfileInformation.create({
        userID,
        following: false,
        userNickname,
        followersCounter: 1,
        followingCounter: undefined,
        playlistsCounter: undefined,
    });
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

        const followersCounter = screen.getByText(/.*followers.*1/i);
        expect(followersCounter).toBeTruthy();
    });

    const followersCounter = screen.getByText(/.*followers.*1/i);
    fireEvent.press(followersCounter);

    await waitFor(() => {
        expect(screen.getByTestId('search-user-followers-screen')).toBeTruthy();
    });

    return screen;
}
