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

const mpeLibrarySearchModel = createModel(
    {
        searchQuery: '',
        page: 1,
    },
    {
        events: {
            LOAD_MORE: () => ({}),
        },
    },
);

type MpeLibrarySearchMachineState = State<
    ContextFrom<typeof mpeLibrarySearchModel>,
    EventFrom<typeof mpeLibrarySearchModel>
>;

const incrementPage = mpeLibrarySearchModel.assign({
    page: ({ page }) => page + 1,
});

const mpeLibrarySearchMachine = mpeLibrarySearchModel.createMachine({
    initial: 'displayingRooms',

    states: {
        displayingRooms: {
            meta: {
                test: async (
                    { screen }: TestingContext,
                    {
                        context: { searchQuery, page },
                    }: MpeLibrarySearchMachineState,
                ) => {
                    const expectedRooms = getPage(
                        filterMpeRoomsByName(fakeMpeRooms, searchQuery),
                        page,
                        MPE_SEARCH_PAGE_LENGTH,
                    );

                    for (const room of expectedRooms) {
                        const roomCard = await screen.findByText(room.roomName);
                        expect(roomCard).toBeTruthy();
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

const mpeLibrarySearchTestModel = createTestModel<
    TestingContext,
    ContextFrom<typeof mpeLibrarySearchMachine>
>(mpeLibrarySearchMachine).withEvents({
    LOAD_MORE: async ({ screen }) => {
        const loadMoreButton = await screen.findByText(/load.*more/i);
        expect(loadMoreButton).toBeTruthy();

        fireEvent.press(loadMoreButton);
    },
});

describe('MPE Rooms Search', () => {
    const testPlans = mpeLibrarySearchTestModel.getSimplePathPlansTo(
        (state) => {
            const isFinalState = state.done;
            return isFinalState === true;
        },
    );

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

                    const goToLibraryButton = screen.getByText(/^library$/i);
                    expect(goToLibraryButton).toBeTruthy();

                    fireEvent.press(goToLibraryButton);

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
        mpeLibrarySearchTestModel.testCoverage();
    });
});
