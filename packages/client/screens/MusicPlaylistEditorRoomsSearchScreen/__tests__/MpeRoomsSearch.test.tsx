import { MpeRoomSummary } from '@musicroom/types';
import { random } from 'faker';
import { ContextFrom, EventFrom, State } from 'xstate';
import { createModel as createTestModel } from '@xstate/test';
import { createModel } from 'xstate/lib/model';
import { db, generateArray, generateMpeRoomSummary } from '../../../tests/data';
import {
    render,
    fireEvent,
    renderApp,
    waitFor,
    within,
} from '../../../tests/tests-utils';

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const fakeMpeRooms = [
    ...generateArray({
        minLength: 21,
        maxLength: 29,
        fill: () => generateMpeRoomSummary(),
    }),
    ...generateArray({
        minLength: 21,
        maxLength: 29,
        fill: () =>
            generateMpeRoomSummary({
                roomName: `Biolay ${random.words()}`,
            }),
    }),
];

const MPE_SEARCH_PAGE_LENGTH = 10;

function filterMpeRoomsByName(
    rooms: MpeRoomSummary[],
    expectedRoomName: string,
): MpeRoomSummary[] {
    return rooms.filter(({ roomName }) =>
        roomName.toLowerCase().startsWith(expectedRoomName.toLowerCase()),
    );
}

function getPage<Item>(
    items: Item[],
    page: number,
    pageLength: number,
): Item[] {
    return items.slice((page - 1) * pageLength, page * pageLength);
}

function getPagesCount<Item>(items: Item[], pageLength: number): number {
    const itemsLength = items.length;
    if (itemsLength === 0) {
        return 1;
    }

    return Math.ceil(itemsLength / pageLength);
}

const mpeRoomsSearchModel = createModel(
    {
        searchQuery: '',
        page: 1,
    },
    {
        events: {
            LOAD_MORE: () => ({}),
            SEARCH_ROOM_BY_NAME: (roomName: string) => ({ roomName }),
        },
    },
);

type MpeRoomsSearchMachineState = State<
    ContextFrom<typeof mpeRoomsSearchModel>,
    EventFrom<typeof mpeRoomsSearchModel>
>;

const incrementPage = mpeRoomsSearchModel.assign(
    {
        page: ({ page }) => page + 1,
    },
    'LOAD_MORE',
);

const assignSearchQueryToContext = mpeRoomsSearchModel.assign(
    {
        searchQuery: (_, { roomName }) => roomName,
        page: 1,
    },
    'SEARCH_ROOM_BY_NAME',
);

const mpeRoomsSearchMachine = mpeRoomsSearchModel.createMachine({
    initial: 'displayingRooms',

    states: {
        displayingRooms: {
            meta: {
                test: async (
                    { screen }: TestingContext,
                    {
                        context: { searchQuery, page },
                    }: MpeRoomsSearchMachineState,
                ) => {
                    const expectedRooms = getPage(
                        filterMpeRoomsByName(fakeMpeRooms, searchQuery),
                        page,
                        MPE_SEARCH_PAGE_LENGTH,
                    );

                    for (const room of expectedRooms) {
                        const roomCard = await screen.findByTestId(
                            `mpe-room-card-${room.roomID}`,
                        );
                        expect(roomCard).toBeTruthy();
                        expect(roomCard).toHaveTextContent(room.roomName);

                        const roomCardScreen = within(roomCard);
                        const invitedIcon =
                            roomCardScreen.queryByLabelText(/you.*invited/i);
                        const publicRoomIcon =
                            roomCardScreen.queryByLabelText(/public.*room/i);
                        const privateRoomIcon =
                            roomCardScreen.queryByLabelText(/private.*room/i);

                        switch (room.isOpen) {
                            case true: {
                                expect(publicRoomIcon).toBeTruthy();
                                expect(privateRoomIcon).toBeNull();

                                switch (room.isInvited) {
                                    case true: {
                                        expect(invitedIcon).toBeTruthy();

                                        break;
                                    }

                                    case false: {
                                        expect(invitedIcon).toBeNull();

                                        break;
                                    }

                                    default: {
                                        throw new Error(
                                            'Reached unreachable state',
                                        );
                                    }
                                }

                                break;
                            }

                            case false: {
                                expect(privateRoomIcon).toBeTruthy();
                                expect(publicRoomIcon).toBeNull();
                                expect(invitedIcon).toBeNull();

                                break;
                            }

                            default: {
                                throw new Error('Reached unreachable state');
                            }
                        }
                    }
                },
            },

            always: {
                cond: ({ searchQuery, page }) => {
                    const pagesCount = getPagesCount(
                        filterMpeRoomsByName(fakeMpeRooms, searchQuery),
                        MPE_SEARCH_PAGE_LENGTH,
                    );
                    const isLastPage = page === pagesCount;
                    return isLastPage;
                },

                target: 'fetchedAllMpeRooms',
            },

            on: {
                LOAD_MORE: {
                    actions: incrementPage,
                },

                SEARCH_ROOM_BY_NAME: {
                    actions: assignSearchQueryToContext,
                },
            },
        },

        fetchedAllMpeRooms: {
            type: 'final',

            meta: {
                test: async ({ screen }: TestingContext) => {
                    await waitFor(() => {
                        const loadMoreButton =
                            screen.queryByText(/load.*more/i);
                        expect(loadMoreButton).toBeNull();
                    });
                },
            },
        },
    },
});

const mpeRoomsSearchTestModel = createTestModel<
    TestingContext,
    ContextFrom<typeof mpeRoomsSearchMachine>
>(mpeRoomsSearchMachine).withEvents({
    LOAD_MORE: async ({ screen }) => {
        const loadMoreButton = await screen.findByText(/load.*more/i);
        expect(loadMoreButton).toBeTruthy();

        fireEvent.press(loadMoreButton);
    },

    SEARCH_ROOM_BY_NAME: {
        exec: async ({ screen }, _event) => {
            const { roomName } = _event as EventFrom<
                typeof mpeRoomsSearchMachine,
                'SEARCH_ROOM_BY_NAME'
            >;

            const searchInput = await screen.findByPlaceholderText(
                /search.*room/i,
            );
            expect(searchInput).toBeTruthy();

            fireEvent(searchInput, 'focus');
            fireEvent.changeText(searchInput, roomName);
            fireEvent(searchInput, 'submitEditing');
        },

        cases: [
            {
                roomName: 'Biolay',
            } as Omit<
                EventFrom<typeof mpeRoomsSearchMachine, 'SEARCH_ROOM_BY_NAME'>,
                'type'
            >,
        ],
    },
});

describe('MPE Rooms Search', () => {
    const testPlans = mpeRoomsSearchTestModel.getSimplePathPlansTo((state) => {
        const isFinalState = state.done;
        return isFinalState === true;
    });

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    for (const mpeRoomToCreate of fakeMpeRooms) {
                        db.searchableMpeRooms.create(mpeRoomToCreate);
                    }

                    const screen = await renderApp();

                    expect(
                        screen.getAllByText(/home/i).length,
                    ).toBeGreaterThanOrEqual(1);

                    const goToMpeRoomsSearchButton = screen.getByText(
                        /go.*to.*music.*playlist.*editor/i,
                    );
                    expect(goToMpeRoomsSearchButton).toBeTruthy();

                    fireEvent.press(goToMpeRoomsSearchButton);

                    const searchInput = await screen.findByPlaceholderText(
                        /search.*room/i,
                    );
                    expect(searchInput).toBeTruthy();

                    await path.test({
                        screen,
                    });
                });
            });
        });
    });

    it('should have full coverage', () => {
        mpeRoomsSearchTestModel.testCoverage();
    });
});

async function withinMpeRoomsSearchScreen(screen: ReturnType<typeof render>) {
    return within(await screen.findByTestId('mpe-room-search-engine'));
}

test('Pressing Cancel button refreshes the list', async () => {
    for (const mpeRoomToCreate of fakeMpeRooms) {
        db.searchableMpeRooms.create(mpeRoomToCreate);
    }

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const goToMpeRoomsSearchButton = screen.getByText(
        /go.*to.*music.*playlist.*editor/i,
    );
    expect(goToMpeRoomsSearchButton).toBeTruthy();

    fireEvent.press(goToMpeRoomsSearchButton);

    const libraryScreen = await withinMpeRoomsSearchScreen(screen);

    const searchInput = await libraryScreen.findByPlaceholderText(
        /search.*room/i,
    );
    expect(searchInput).toBeTruthy();

    const firstPageLastRoom = fakeMpeRooms[MPE_SEARCH_PAGE_LENGTH - 1];
    await waitFor(() => {
        const roomCard = libraryScreen.getByText(firstPageLastRoom.roomName);
        expect(roomCard).toBeTruthy();
    });

    const loadMoreButton = await libraryScreen.findByText(/load.*more/i);
    expect(loadMoreButton).toBeTruthy();

    fireEvent.press(loadMoreButton);

    const secondPageLastRoom = fakeMpeRooms[MPE_SEARCH_PAGE_LENGTH * 2 - 1];
    await waitFor(() => {
        const roomCard = libraryScreen.getByText(secondPageLastRoom.roomName);
        expect(roomCard).toBeTruthy();
    });

    const searchQuery = 'Biolay';
    fireEvent(searchInput, 'focus');
    fireEvent.changeText(searchInput, 'Biolay');
    fireEvent(searchInput, 'submitEditing');

    const filteredRooms = getPage(
        filterMpeRoomsByName(fakeMpeRooms, searchQuery),
        1,
        MPE_SEARCH_PAGE_LENGTH,
    );
    const firstFilteredPageLastRoom = filteredRooms[filteredRooms.length - 1];

    await waitFor(() => {
        const roomCard = libraryScreen.getByText(
            firstFilteredPageLastRoom.roomName,
        );
        expect(roomCard).toBeTruthy();
    });

    const cancelButton = libraryScreen.getByText(/cancel/i);
    expect(cancelButton).toBeTruthy();

    fireEvent.press(cancelButton);

    /**
     * When pressing cancel, the list should be refreshed.
     * The second page goes out, while the first page is refreshed and displayed again.
     */
    await waitFor(() => {
        const roomCard = libraryScreen.getByText(firstPageLastRoom.roomName);
        expect(roomCard).toBeTruthy();
    });

    const secondPageRoom = libraryScreen.queryByText(
        secondPageLastRoom.roomName,
    );
    expect(secondPageRoom).toBeNull();

    const filteredResultsRoom = libraryScreen.queryByText(
        firstFilteredPageLastRoom.roomName,
    );
    expect(filteredResultsRoom).toBeNull();
});

test('Pressing Clear button refreshes the list and resets the search query', async () => {
    for (const mpeRoomToCreate of fakeMpeRooms) {
        db.searchableMpeRooms.create(mpeRoomToCreate);
    }

    const screen = await renderApp();

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const goToMpeRoomsSearchButton = screen.getByText(
        /go.*to.*music.*playlist.*editor/i,
    );
    expect(goToMpeRoomsSearchButton).toBeTruthy();

    fireEvent.press(goToMpeRoomsSearchButton);

    const libraryScreen = await withinMpeRoomsSearchScreen(screen);

    const searchInput = await libraryScreen.findByPlaceholderText(
        /search.*room/i,
    );
    expect(searchInput).toBeTruthy();

    const roomName = 'Biolay';
    fireEvent(searchInput, 'focus');
    fireEvent.changeText(searchInput, roomName);
    fireEvent(searchInput, 'submitEditing');

    const filteredRooms = getPage(
        filterMpeRoomsByName(fakeMpeRooms, roomName),
        1,
        MPE_SEARCH_PAGE_LENGTH,
    );
    const firstFilteredPageLastRoom = filteredRooms[filteredRooms.length - 1];

    await waitFor(() => {
        const roomCard = libraryScreen.getByText(
            firstFilteredPageLastRoom.roomName,
        );
        expect(roomCard).toBeTruthy();
    });

    const clearButton = libraryScreen.getByLabelText(/clear.*input/i);
    expect(clearButton).toBeTruthy();

    fireEvent.press(clearButton);

    /**
     * We clear the search query, initial unfiltered results must be displayed.
     */
    const firstPageWithoutFilter = getPage(
        fakeMpeRooms,
        1,
        MPE_SEARCH_PAGE_LENGTH,
    );

    for (const room of firstPageWithoutFilter) {
        const roomCard = await libraryScreen.findByText(room.roomName);
        expect(roomCard).toBeTruthy();
    }
});
