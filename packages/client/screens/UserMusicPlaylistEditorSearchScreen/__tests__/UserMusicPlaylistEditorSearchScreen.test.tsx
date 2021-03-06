import {
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    MpeRoomSummary,
    MtvRoomUsersListElement,
} from '@musicroom/types';
import { rest } from 'msw';
import { EventFrom, StateFrom, assign } from 'xstate';
import { createModel as createTestModel } from '@xstate/test';
import { createModel } from 'xstate/lib/model';
import cases from 'jest-in-case';
import Toast from 'react-native-toast-message';
import invariant from 'tiny-invariant';
import { datatype, internet } from 'faker';
import {
    db,
    generateArray,
    generateMpeRoomSummary,
    generateMtvWorklowState,
} from '../../../tests/data';
import {
    render,
    fireEvent,
    renderApp,
    waitFor,
    within,
    noop,
} from '../../../tests/tests-utils';
import { server } from '../../../tests/server/test-server';
import { SERVER_ENDPOINT } from '../../../constants/Endpoints';
import { assertEventType } from '../../../machines/utils';
import { serverSocket } from '../../../services/websockets';
import { withAuthentication } from '../../../tests/server/handlers';

const OTHER_USER_MPE_ROOMS_PAGE_LENGTH = 10;
const OTHER_USER_MPE_ROOMS = generateArray({
    minLength: OTHER_USER_MPE_ROOMS_PAGE_LENGTH,
    maxLength: OTHER_USER_MPE_ROOMS_PAGE_LENGTH * 2,
    fill: () => generateMpeRoomSummary({ isOpen: true }),
});
const OTHER_USER_ID = '9ed60e96-d5fc-40b3-b842-aeaa75e93972';

interface TestingContext {
    screen: ReturnType<typeof render>;
    otherUserID: string;
    otherUserNickname: string;
}

function filterMpeRoomSummaryByName(
    mpeRooms: MpeRoomSummary[],
    searchQuery: string,
) {
    return mpeRooms.filter((mpeRoom) => {
        return mpeRoom.roomName
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
    });
}

function getPage<Item>(
    items: Item[],
    page: number,
    pageLength: number,
): Item[] {
    return items.slice((page - 1) * pageLength, page * pageLength);
}

function withinOtherUserMpeRoomsScreen(screen: ReturnType<typeof render>) {
    return within(screen.getByTestId('other-user-mpe-rooms-list'));
}

const otherUserMpeRoomsModel = createModel(
    {
        page: 1,
        searchQuery: '',
        selectedMpeRoomID: undefined as string | undefined,
    },
    {
        events: {
            "Make API fail finding the user and go to user's playlists":
                () => ({}),
            "Make API respond instantly and go to user's playlists": () => ({}),
            "Delay API response and go to user's playlists": () => ({}),
            "Make API return the user disallows viewing her MPE rooms and go to user's playlists":
                () => ({}),
            'Start interacting with the application': () => ({}),
            'Load more': () => ({}),
            'Search by name': (args: { searchQuery: string }) => args,
            'Clear search query': () => ({}),
            'Cancel search query': () => ({}),
            'Select MPE room to display': (args: { mpeRoomID: string }) => args,
            'Go back': () => ({}),
        },
    },
);

type OtherUserMpeRoomsMachineState = StateFrom<typeof otherUserMpeRoomsMachine>;

const otherUserMpeRoomsMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QHkAuALMAnABAVVmxwFkAFAURwCUB7GgW1gDoDsByWHAByxoDMAlgBswAYmIBDANZgcAQVIBJHHwnCVAgHYQtUHBlkBXQrgnacUGvqvH2nLkIkBPIQNip4SEFxqwBqARpNRFAAD0QAWgBmADYAdiYADgBOOIAmGMS4gEZsqLzEgBoQJ0iYtKYABmSAFniAVnqYpprKqKiAXw7itExcVlwySloGZgGObl5BEXFpWQVlLDgfcy13M1QhJxwzCAsrVBsTCYdnV3dPUB8-AKCQkHCERJqk+pr2uMrEtLTE2LTiqUENlKhU0nFWql3n9folEl0egZ+iYSBRqHRGCxjvYpsIxAARMCObYLHBLWArQg7cyWaw4WxYE7E84ee7XfyBYJeR4RXJJFIguL1bI1DJRCEAkqIKLVJg1dK5SoxZLVHJpeoIkC9IgDVHDDFjbGTfh42YyeRKMlgVCGLCafSYekonSwCRCIQ0ADunAAbgIwJ7dDg+nqyQbqXtaYcnXZuMy3KyvOzblywpEhTEmOqaq1vvUleKooDpfKmKl6lE-pWYtkVdlNdrkUQhujRkwAMroL04D0SHSaPRaHQAYwkhywonbqAkWFQOC0qGwEmHAQHOEDGAdsgkXAcAlHKbZvg5d25iGSaWSTGyaRq9TSH2ycSi9+LCF+V5f5Zqf1SyXFDZIvgKItiMmKKJo6yaJs2ywF2gZrgyEwtrwoyTtOs7ztBS4rkGG7oFuOy7q4B6ckeNxkWeCD-pmMpPm0lRxM0uQxG+IrZEw5RPsKlTvE0KQxIBIa6qBBpMPibinE4QZIZwKFicQNBLKGqGMHSvYQKI5EnqmDyIE+MS0fUcTpJkwo3skb7gokVQ3jW+SJE+zxNEJOogWiYHMBJFLEjJRryWhAAyNB9jg9BKWA2mHlRIpCte-ypDW9TPJZUoIDWFTJM0yT1LUtRfBq3RakBIkeWJ3lSX5sYBYwk5gDOw4EQARtsmgSPQkVJse0VpsCNR8rU8rgskfyJMqrFpREaRKkw97PJk2TxM+bxxK5TaDGVbYVb5iH+WiqmwKIADCIgzjghANQRACOhjYECVzdZRvXZH8HHxPEvFNLxo1vlND6cYkuWgvmMSVllhWIsJ7n6ltkk7XoskqQax1mMORLnfVWCNTgN13VFT16e+aQgkwsQvvkl72ZU9S-YtNlZc+IpZP+uXpGtwHNptmLbc4VWMnJ+3I+2RJgCuSMMHSLpSfjp69equUA20UQPs0yXglZoNZskII5e8mSJNUNTs6VMPc3DvNrjVogAOJWE1y5SDLumPBk6RyiqI2VCCGTEzTaWilEWbtItvE1nEfyrZqmg0BAcD3I2HMbabhqxjwJoiE79w8ne9ScV+tYxEqRRpSCNk+8qlbU0qFYQ8VUOc8nWJENHc58DQhjaJnMU-HK4eGbEN6NM5tNxFeavfLW3yF80nRFQnJutpiABq-oIQje2UAd86cB3EiGBgSkCAAXpAXe9REoqZjlUS1BHWSNEWaUg3K-Xh2DyrPs+xvQ4vzCdt2GkgxDn3GOJSZ9CaNASHCUUNQ6yAynm+dolRSY-mmsqEOvE0jfwbr-JgEEoIwXOvBPmyFBajHAY8GsV4vZNCFLkEaURRRsSvK0cyIdjJNBrIJOeJUf6eXEubaSu1qpkMxIpZSNVODRg0hQ-Sd4r7qlHikFUY0vbMMDiZRokJjL-lyPCHh9ck64J5kI9eIjN5iWCn2SAOx3Ti0YLI98T5MqOTQcKd4i02KA04tNL42RGi1AfJHSGbkcH8JMSQgWFjyFdQorLQmIplZlkUSNZIKjC7ZDYjeHxF4XpfALIZfRIT1qhnCYIoMNVHF0SvEKHMz5QS3i0YgmUAMfjPn6heQss9imJ1KQaRxERw7IOzLmdUBZny-UppxJimj+6MJoV0LoQA */
    otherUserMpeRoomsModel.createMachine(
        {
            id: 'Other User MPE Rooms',
            initial: "User's profile",
            states: {
                "User's profile": {
                    meta: {
                        test: async ({
                            screen,
                            otherUserNickname,
                            otherUserID,
                        }: TestingContext) => {
                            expect(
                                await screen.findByText(otherUserNickname),
                            ).toBeTruthy();

                            const playlistCounter = await screen.findByTestId(
                                `${otherUserID}-Playlists-user-profile-information-${OTHER_USER_MPE_ROOMS.length}`,
                            );
                            expect(playlistCounter).toBeTruthy();
                        },
                    },
                    on: {
                        "Make API fail finding the user and go to user's playlists":
                            {
                                target: '#Other User MPE Rooms.User not found',
                            },
                        "Make API respond instantly and go to user's playlists":
                            {
                                target: "#Other User MPE Rooms.Instantly showing user's MPE rooms",
                            },
                        "Delay API response and go to user's playlists": {
                            target: '#Other User MPE Rooms.Show loading indicator',
                        },
                        "Make API return the user disallows viewing her MPE rooms and go to user's playlists":
                            {
                                target: "#Other User MPE Rooms.Viewing user's MPE rooms is unauthorized",
                            },
                    },
                },
                'User not found': {
                    type: 'final',
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await waitFor(() => {
                                const userNotFound =
                                    screen.getByText(/user.*not.*found/i);
                                expect(userNotFound).toBeTruthy();
                            });

                            await waitFor(() => {
                                expect(Toast.show).toHaveBeenCalledWith({
                                    type: 'error',
                                    text1: expect.any(String),
                                });
                            });
                        },
                    },
                },
                "Viewing user's MPE rooms is unauthorized": {
                    type: 'final',
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await waitFor(() => {
                                const accessForbidden = screen.getByText(
                                    /access.*user.*rooms.*forbidden/i,
                                );
                                expect(accessForbidden).toBeTruthy();
                            });
                        },
                    },
                },
                'Show loading indicator': {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await waitFor(() => {
                                const loadingIndicator =
                                    screen.getByText(/loading.*user.*rooms/i);
                                expect(loadingIndicator).toBeTruthy();
                            });

                            await waitFor(() => {
                                const searchRoomsTextInput =
                                    withinOtherUserMpeRoomsScreen(
                                        screen,
                                    ).getByPlaceholderText(/search.*room/i);
                                expect(searchRoomsTextInput).toBeTruthy();
                            });

                            const loadingIndicator =
                                withinOtherUserMpeRoomsScreen(
                                    screen,
                                ).queryByText(/loading.*user.*rooms/i);
                            expect(loadingIndicator).toBeNull();
                        },
                    },
                    on: {
                        'Start interacting with the application': {
                            target: "#Other User MPE Rooms.Displaying user's MPE rooms",
                        },
                    },
                },
                "Instantly showing user's MPE rooms": {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            let foundLoadingIndicator = false;
                            await waitFor(() => {
                                const loadingIndicator =
                                    screen.queryByText(/loading.*user.*rooms/i);
                                if (
                                    foundLoadingIndicator === false &&
                                    loadingIndicator !== null
                                ) {
                                    foundLoadingIndicator = true;
                                }

                                const searchRoomsTextInput =
                                    withinOtherUserMpeRoomsScreen(
                                        screen,
                                    ).getByPlaceholderText(/search.*room/i);
                                expect(searchRoomsTextInput).toBeTruthy();
                            });

                            expect(foundLoadingIndicator).toBeFalsy();
                        },
                    },
                    on: {
                        'Start interacting with the application': {
                            target: "#Other User MPE Rooms.Displaying user's MPE rooms",
                        },
                    },
                },
                "Displaying user's MPE rooms": {
                    initial: 'More MPE rooms to load',
                    states: {
                        'More MPE rooms to load': {
                            always: {
                                cond: "Has fetched all user's MPE rooms",
                                target: "#Other User MPE Rooms.Displaying user's MPE rooms.Loaded all MPE rooms",
                            },
                            meta: {
                                test: async (
                                    { screen }: TestingContext,
                                    {
                                        context: { page, searchQuery },
                                    }: OtherUserMpeRoomsMachineState,
                                ) => {
                                    await waitFor(() => {
                                        const totalMpeRoomsFetched =
                                            page *
                                            OTHER_USER_MPE_ROOMS_PAGE_LENGTH;
                                        const allDisplayedMpeRooms =
                                            withinOtherUserMpeRoomsScreen(
                                                screen,
                                            ).getAllByTestId(
                                                /^mpe-room-card-/i,
                                            );
                                        expect(
                                            allDisplayedMpeRooms.length,
                                        ).toBe(totalMpeRoomsFetched);
                                    });

                                    for (const mpeRoom of getPage(
                                        filterMpeRoomSummaryByName(
                                            OTHER_USER_MPE_ROOMS,
                                            searchQuery,
                                        ),
                                        page,
                                        OTHER_USER_MPE_ROOMS_PAGE_LENGTH,
                                    )) {
                                        expect(
                                            await withinOtherUserMpeRoomsScreen(
                                                screen,
                                            ).findByText(mpeRoom.roomName),
                                        ).toBeTruthy();
                                    }
                                },
                            },
                        },
                        'Loaded all MPE rooms': {
                            meta: {
                                test: async (
                                    { screen }: TestingContext,
                                    {
                                        context: { searchQuery },
                                    }: OtherUserMpeRoomsMachineState,
                                ) => {
                                    const allOtherUserMpeRoomsFileteredByName =
                                        filterMpeRoomSummaryByName(
                                            OTHER_USER_MPE_ROOMS,
                                            searchQuery,
                                        );

                                    await waitFor(() => {
                                        const allDisplayedMpeRooms =
                                            withinOtherUserMpeRoomsScreen(
                                                screen,
                                            ).getAllByTestId(
                                                /^mpe-room-card-/i,
                                            );
                                        expect(
                                            allDisplayedMpeRooms.length,
                                        ).toBe(
                                            allOtherUserMpeRoomsFileteredByName.length,
                                        );
                                    });

                                    for (const mpeRoom of allOtherUserMpeRoomsFileteredByName) {
                                        expect(
                                            await withinOtherUserMpeRoomsScreen(
                                                screen,
                                            ).findByText(mpeRoom.roomName),
                                        ).toBeTruthy();
                                    }
                                },
                            },
                        },
                    },
                    on: {
                        'Load more': {
                            actions: 'increment page index',
                            cond: 'Has more MPE rooms to load',
                            target: "#Other User MPE Rooms.Displaying user's MPE rooms",
                        },
                        'Search by name': {
                            // Necessary, otherwise @xstate/xstate takes this transition
                            // without defining a searchQuery and an error is thrown in
                            // `assign search query to context`, which expects a searchQuery.
                            cond: (_context, event) =>
                                event.searchQuery !== undefined,
                            actions: 'assign search query to context',
                            target: "#Other User MPE Rooms.Displaying user's MPE rooms",
                        },
                        'Clear search query': {
                            actions: 'reset search query from context',
                            target: "#Other User MPE Rooms.Displaying user's MPE rooms",
                        },
                        'Cancel search query': {
                            actions: 'reset search query from context',
                            target: "#Other User MPE Rooms.Displaying user's MPE rooms",
                        },
                        'Select MPE room to display': {
                            actions: 'assign selected mpe room to context',
                            target: '#Other User MPE Rooms.Displaying MPE room',
                        },
                    },
                },
                'Displaying MPE room': {
                    meta: {
                        test: async (
                            { screen }: TestingContext,
                            {
                                context: { selectedMpeRoomID },
                            }: OtherUserMpeRoomsMachineState,
                        ) => {
                            invariant(
                                selectedMpeRoomID !== undefined,
                                'A MPE room must have been selected before going to this state',
                            );

                            const mpeRoom = OTHER_USER_MPE_ROOMS.find(
                                (mpeRoom) =>
                                    mpeRoom.roomID === selectedMpeRoomID,
                            );
                            invariant(
                                mpeRoom !== undefined,
                                'The selected MPE room must exist in the MPE rooms',
                            );

                            await waitFor(() => {
                                const mpeRoomScreen = screen.getByTestId(
                                    `mpe-room-screen-${mpeRoom.roomID}`,
                                );
                                expect(mpeRoomScreen).toBeTruthy();
                            });
                        },
                    },
                    on: {
                        'Go back': {
                            description:
                                'Currently this transition does not work on the application.',
                            target: "#Other User MPE Rooms.Displaying user's MPE rooms",
                        },
                    },
                },
            },
        },
        {
            guards: {
                'Has more MPE rooms to load': ({ page, searchQuery }) => {
                    const otherUserMpeRoomsForNextPage = getPage(
                        filterMpeRoomSummaryByName(
                            OTHER_USER_MPE_ROOMS,
                            searchQuery,
                        ),
                        page + 1,
                        OTHER_USER_MPE_ROOMS_PAGE_LENGTH,
                    );
                    const hasMoreMpeRoomsToLoad =
                        otherUserMpeRoomsForNextPage.length > 0;

                    return hasMoreMpeRoomsToLoad === true;
                },

                "Has fetched all user's MPE rooms": ({ page, searchQuery }) => {
                    const otherUserMpeRoomsForNextPageAndSearchQuery = getPage(
                        filterMpeRoomSummaryByName(
                            OTHER_USER_MPE_ROOMS,
                            searchQuery,
                        ),
                        page + 1,
                        OTHER_USER_MPE_ROOMS_PAGE_LENGTH,
                    );
                    const isNextPageEmpty =
                        otherUserMpeRoomsForNextPageAndSearchQuery.length === 0;

                    return isNextPageEmpty === true;
                },
            },
            actions: {
                'increment page index': assign({
                    page: ({ page }) => page + 1,
                }),

                'assign search query to context': assign({
                    page: (_context) => 1,
                    searchQuery: (_context, event) => {
                        assertEventType(event, 'Search by name');

                        return event.searchQuery;
                    },
                }),

                'reset search query from context': assign({
                    page: (_context) => 1,
                    searchQuery: (_context) => '',
                }),

                'assign selected mpe room to context': assign({
                    selectedMpeRoomID: (_context, event) => {
                        assertEventType(event, 'Select MPE room to display');

                        return event.mpeRoomID;
                    },
                }),
            },
        },
    );

const otherUserMpeRoomsTestModel = createTestModel<TestingContext>(
    otherUserMpeRoomsMachine,
).withEvents({
    "Make API fail finding the user and go to user's playlists": async ({
        screen,
        otherUserID,
    }) => {
        db.userProfileInformation.delete({
            where: {
                userID: {
                    equals: otherUserID,
                },
            },
        });

        const goToOtherUserPlaylistsButton = await within(
            await screen.findByTestId(/-profile-page-screen/),
        ).findByText(/playlists/i);
        expect(goToOtherUserPlaylistsButton).toBeTruthy();

        fireEvent.press(goToOtherUserPlaylistsButton);
    },

    "Make API respond instantly and go to user's playlists": async ({
        screen,
    }) => {
        const goToOtherUserPlaylistsButton = await within(
            await screen.findByTestId(/-profile-page-screen/),
        ).findByText(/playlists/i);
        expect(goToOtherUserPlaylistsButton).toBeTruthy();

        fireEvent.press(goToOtherUserPlaylistsButton);
    },

    "Delay API response and go to user's playlists": async ({ screen }) => {
        server.use(
            rest.post<
                GetUserProfileInformationRequestBody,
                Record<string, never>,
                GetUserProfileInformationResponseBody
            >(
                `${SERVER_ENDPOINT}/user/profile-information`,
                withAuthentication((req, res, ctx) => {
                    const { userID } = req.body;

                    const user = db.userProfileInformation.findFirst({
                        where: {
                            userID: {
                                equals: userID,
                            },
                        },
                    });
                    invariant(
                        user !== null,
                        'The user must have been created in test setup',
                    );

                    const {
                        userNickname,
                        following,
                        followersCounter,
                        followingCounter,
                        playlistsCounter,
                    } = user;

                    return res(
                        ctx.delay(600),
                        ctx.json({
                            userID,
                            userNickname,
                            following,
                            followersCounter: followersCounter ?? undefined,
                            followingCounter: followingCounter ?? undefined,
                            playlistsCounter: playlistsCounter ?? undefined,
                        }),
                    );
                }),
            ),
        );

        const goToOtherUserPlaylistsButton = await within(
            await screen.findByTestId(/-profile-page-screen/),
        ).findByText(/playlists/i);
        expect(goToOtherUserPlaylistsButton).toBeTruthy();

        fireEvent.press(goToOtherUserPlaylistsButton);
    },

    "Make API return the user disallows viewing her MPE rooms and go to user's playlists":
        async ({ screen, otherUserID }) => {
            db.userProfileInformation.update({
                where: {
                    userID: {
                        equals: otherUserID,
                    },
                },
                data: {
                    playlistsCounter: undefined,
                },
            });

            const goToOtherUserPlaylistsButton = await within(
                await screen.findByTestId(/-profile-page-screen/),
            ).findByText(/playlists/i);
            expect(goToOtherUserPlaylistsButton).toBeTruthy();

            fireEvent.press(goToOtherUserPlaylistsButton);
        },

    'Start interacting with the application': noop,

    'Load more': async ({ screen }) => {
        const loadMoreButton = await withinOtherUserMpeRoomsScreen(
            screen,
        ).findByText(/load.*more/i);
        expect(loadMoreButton).toBeTruthy();

        fireEvent.press(loadMoreButton);
    },

    'Search by name': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof otherUserMpeRoomsModel,
            'Search by name'
        >;

        const searchInput = await withinOtherUserMpeRoomsScreen(
            screen,
        ).findByPlaceholderText(/search/i);
        expect(searchInput).toBeTruthy();

        fireEvent(searchInput, 'focus');
        fireEvent.changeText(searchInput, event.searchQuery);
        fireEvent(searchInput, 'submitEditing');
    },

    'Clear search query': async ({ screen }) => {
        const clearInputButton = await withinOtherUserMpeRoomsScreen(
            screen,
        ).findByLabelText(/clear/i);
        expect(clearInputButton).toBeTruthy();

        fireEvent.press(clearInputButton);
    },

    'Cancel search query': async ({ screen }) => {
        const cancelInputButton = await withinOtherUserMpeRoomsScreen(
            screen,
        ).findByText(/cancel/i);
        expect(cancelInputButton).toBeTruthy();

        fireEvent.press(cancelInputButton);
    },

    'Select MPE room to display': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof otherUserMpeRoomsModel,
            'Select MPE room to display'
        >;

        const mpeRoom = OTHER_USER_MPE_ROOMS.find(
            ({ roomID }) => roomID === event.mpeRoomID,
        );
        invariant(
            mpeRoom !== undefined,
            'The selected MPE room must have been created first',
        );

        const mpeRoomCard = await withinOtherUserMpeRoomsScreen(
            screen,
        ).findByText(mpeRoom.roomName);
        expect(mpeRoomCard).toBeTruthy();

        fireEvent.press(mpeRoomCard);
    },
});

cases<{
    events: EventFrom<typeof otherUserMpeRoomsModel>[];
    target:
        | 'User not found'
        | "Instantly showing user's MPE rooms"
        | 'Show loading indicator'
        | "Viewing user's MPE rooms is unauthorized";
}>(
    "Initial fetching of user's information",
    async ({ events, target }) => {
        const otherUser = db.userProfileInformation.create({
            userID: OTHER_USER_ID,
            following: false,
            followersCounter: 0,
            followingCounter: 0,
            playlistsCounter: OTHER_USER_MPE_ROOMS.length,
            mpeRooms: OTHER_USER_MPE_ROOMS.map((mpeRoom) =>
                db.searchableMpeRooms.create(mpeRoom),
            ),
        });

        const plan = otherUserMpeRoomsTestModel.getPlanFromEvents(events, {
            target,
        });

        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID: OTHER_USER_ID,
        });

        const otherUserProfileScreenTitle = await screen.findByText(
            `${otherUser.userNickname} profile`,
        );
        expect(otherUserProfileScreenTitle).toBeTruthy();

        await plan.test({
            screen,
            otherUserID: OTHER_USER_ID,
            otherUserNickname: otherUser.userNickname,
        });
    },
    {
        'Displays an error when user could not be found': {
            events: [
                {
                    type: "Make API fail finding the user and go to user's playlists",
                },
            ],
            target: 'User not found',
        },

        'Displays an error when user disallows viewing her playlists': {
            events: [
                {
                    type: "Make API return the user disallows viewing her MPE rooms and go to user's playlists",
                },
            ],
            target: "Viewing user's MPE rooms is unauthorized",
        },

        'Displays loading indicator if API takes some time to respond and then the list':
            {
                events: [
                    {
                        type: "Delay API response and go to user's playlists",
                    },
                ],
                target: 'Show loading indicator',
            },

        "Directly displays user's rooms": {
            events: [
                {
                    type: "Make API respond instantly and go to user's playlists",
                },
            ],
            target: "Instantly showing user's MPE rooms",
        },
    },
);

cases<{
    events: EventFrom<typeof otherUserMpeRoomsModel>[];
    target:
        | {
              "Displaying user's MPE rooms":
                  | 'More MPE rooms to load'
                  | 'Loaded all MPE rooms';
          }
        | 'Displaying MPE room';
}>(
    "Fetching of user's MPE rooms",
    async ({ events, target }) => {
        const otherUser = db.userProfileInformation.create({
            userID: OTHER_USER_ID,
            following: false,
            followersCounter: 0,
            followingCounter: 0,
            playlistsCounter: OTHER_USER_MPE_ROOMS.length,
            mpeRooms: OTHER_USER_MPE_ROOMS.map((mpeRoom) =>
                db.searchableMpeRooms.create(mpeRoom),
            ),
        });

        const plan = otherUserMpeRoomsTestModel.getPlanFromEvents(events, {
            target,
        });

        const screen = await goToUserProfileThroughMusicTrackVoteRoom({
            userID: OTHER_USER_ID,
        });

        const otherUserProfileScreenTitle = await screen.findByText(
            `${otherUser.userNickname} profile`,
        );
        expect(otherUserProfileScreenTitle).toBeTruthy();

        await plan.test({
            screen,
            otherUserID: OTHER_USER_ID,
            otherUserNickname: otherUser.userNickname,
        });
    },
    {
        "Fetches all user's MPE rooms": {
            events: [
                {
                    type: "Make API respond instantly and go to user's playlists",
                },
                { type: 'Start interacting with the application' },
                { type: 'Load more' },
            ],
            target: {
                "Displaying user's MPE rooms": 'Loaded all MPE rooms',
            },
        },

        "Searches rooms by one's name and loads all of them": {
            events: [
                {
                    type: "Make API respond instantly and go to user's playlists",
                },
                { type: 'Start interacting with the application' },
                {
                    type: 'Search by name',
                    searchQuery: OTHER_USER_MPE_ROOMS[0].roomName,
                },
            ],
            target: {
                "Displaying user's MPE rooms": 'Loaded all MPE rooms',
            },
        },

        "Searches rooms by one's name, then clears the query and displays all rooms unfiltered":
            {
                events: [
                    {
                        type: "Make API respond instantly and go to user's playlists",
                    },
                    { type: 'Start interacting with the application' },
                    {
                        type: 'Search by name',
                        searchQuery: OTHER_USER_MPE_ROOMS[0].roomName,
                    },
                    {
                        type: 'Clear search query',
                    },
                    {
                        type: 'Load more',
                    },
                ],
                target: {
                    "Displaying user's MPE rooms": 'Loaded all MPE rooms',
                },
            },

        "Searches rooms by one's name, then cancels the query and displays all rooms unfiltered":
            {
                events: [
                    {
                        type: "Make API respond instantly and go to user's playlists",
                    },
                    { type: 'Start interacting with the application' },
                    {
                        type: 'Search by name',
                        searchQuery: OTHER_USER_MPE_ROOMS[0].roomName,
                    },
                    {
                        type: 'Cancel search query',
                    },
                    {
                        type: 'Load more',
                    },
                ],
                target: {
                    "Displaying user's MPE rooms": 'Loaded all MPE rooms',
                },
            },

        'Goes to a fetched MPE room screen': {
            events: [
                {
                    type: "Make API respond instantly and go to user's playlists",
                },
                { type: 'Start interacting with the application' },
                {
                    type: 'Select MPE room to display',
                    mpeRoomID: OTHER_USER_MPE_ROOMS[0].roomID,
                },
            ],
            target: 'Displaying MPE room',
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
