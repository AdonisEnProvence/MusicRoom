import { ContextFrom, EventFrom, State } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import { random } from 'faker';
import invariant from 'tiny-invariant';
import {
    db,
    generateMpeWorkflowState,
    generateMtvWorklowState,
} from '../../../tests/data';
import {
    render,
    renderApp,
    waitFor,
    fireEvent,
    within,
} from '../../../tests/tests-utils';
import { serverSocket } from '../../../services/websockets';
import { openMpeSettingsBottomSheetModal } from '../../../tests/tests-mpe-utils';

interface TestingContext {
    screen: ReturnType<typeof render>;
    fakeMpeRoom: ReturnType<typeof db.searchableMpeRooms.create>;
}

const exportToMtvModel = createModel(
    {
        loadedMtvRoomName: undefined as string | undefined,

        roomName: undefined as string | undefined,
    },
    {
        events: {
            LOAD_MTV_ROOM: (roomName: string) => ({ roomName }),

            GO_TO_LIBRARY: () => ({}),
            GO_TO_MPE_ROOM: () => ({}),
            EXPORT_TO_MTV: () => ({}),
            SET_ROOM_NAME_AND_GO_NEXT: (roomName: string) => ({ roomName }),
            GO_NEXT: () => ({}),
            GO_BACK: () => ({}),
        },
    },
);

const assignRoomNameToContext = exportToMtvModel.assign(
    {
        roomName: (_, event) => event.roomName,
    },
    'SET_ROOM_NAME_AND_GO_NEXT',
);

const assignLoadedMtvRoomNameToContext = exportToMtvModel.assign(
    {
        loadedMtvRoomName: (_, event) => event.roomName,
    },
    'LOAD_MTV_ROOM',
);

type ExportToMtvMachineContext = ContextFrom<typeof exportToMtvModel>;
type ExportToMtvMachineEvent = EventFrom<typeof exportToMtvModel>;

type ExportToMtvMachineState = State<
    ExportToMtvMachineContext,
    ExportToMtvMachineEvent
>;

const exportToMtvMachine = exportToMtvModel.createMachine({
    id: 'exportToMtv',

    initial: 'home',

    states: {
        home: {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    await waitFor(() => {
                        expect(
                            screen.getAllByText(/home/i).length,
                        ).toBeGreaterThanOrEqual(1);
                    });
                },
            },

            on: {
                GO_TO_LIBRARY: {
                    target: 'library',
                },

                LOAD_MTV_ROOM: {
                    target: 'mtvRoomLoadedInThePlayer',

                    actions: assignLoadedMtvRoomNameToContext,
                },
            },
        },

        mtvRoomLoadedInThePlayer: {
            meta: {
                test: async (
                    { screen }: TestingContext,
                    { context: { loadedMtvRoomName } }: ExportToMtvMachineState,
                ) => {
                    invariant(
                        typeof loadedMtvRoomName === 'string',
                        'A MTV room must have been loaded',
                    );

                    const musicPlayerMini =
                        screen.getByTestId('music-player-mini');
                    expect(musicPlayerMini).toBeTruthy();

                    await waitFor(() => {
                        expect(
                            within(musicPlayerMini).getByText(
                                loadedMtvRoomName,
                            ),
                        ).toBeTruthy();
                    });
                },
            },

            on: {
                GO_TO_LIBRARY: {
                    target: 'library',
                },
            },
        },

        library: {
            meta: {
                test: async ({ screen, fakeMpeRoom }: TestingContext) => {
                    await waitFor(() => {
                        const roomCard = screen.getByText(fakeMpeRoom.roomName);
                        expect(roomCard).toBeTruthy();
                    });
                },
            },

            on: {
                GO_TO_MPE_ROOM: {
                    target: 'mpeRoom',
                },
            },
        },

        mpeRoom: {
            meta: {
                test: async ({ screen, fakeMpeRoom }: TestingContext) => {
                    await waitFor(() => {
                        const mpeRoomScreenTitle = screen.getByText(
                            new RegExp(
                                `playlist.*${fakeMpeRoom.roomName}`,
                                'i',
                            ),
                        );
                        expect(mpeRoomScreenTitle).toBeTruthy();
                    });
                },
            },

            on: {
                EXPORT_TO_MTV: {
                    target: 'roomName',
                },
            },
        },

        roomName: {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    const roomNameScreenTitle = await screen.findByText(
                        /what.*is.*name.*room/i,
                    );
                    expect(roomNameScreenTitle).toBeTruthy();
                },
            },

            on: {
                SET_ROOM_NAME_AND_GO_NEXT: {
                    target: 'openingStatus',

                    actions: assignRoomNameToContext,
                },

                GO_BACK: {
                    target: 'wentBackFromRoomNameScreen',
                },
            },
        },

        openingStatus: {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    const openingStatusScreenTitle = await screen.findByText(
                        /what.*is.*opening.*status.*room/i,
                    );
                    expect(openingStatusScreenTitle).toBeTruthy();
                },
            },

            on: {
                GO_NEXT: {
                    target: 'physicalConstraints',
                },
            },
        },

        physicalConstraints: {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    const physicalConstraintsScreenTitle =
                        await screen.findByText(
                            /want.*restrict.*voting.*physical.*constraints/i,
                        );
                    expect(physicalConstraintsScreenTitle).toBeTruthy();
                },
            },

            on: {
                GO_NEXT: {
                    target: 'playingMode',
                },
            },
        },

        playingMode: {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    const playingModeScreenTitle = await screen.findByText(
                        /which.*playing.*mode/i,
                    );
                    expect(playingModeScreenTitle).toBeTruthy();
                },
            },

            on: {
                GO_NEXT: {
                    target: 'votesConstraints',
                },
            },
        },

        votesConstraints: {
            meta: {
                test: async ({ screen }: TestingContext) => {
                    const votesConstraitsScreenTitle = await screen.findByText(
                        /how.*many.*votes.*song.*played/i,
                    );
                    expect(votesConstraitsScreenTitle).toBeTruthy();
                },
            },

            on: {
                GO_NEXT: {
                    target: 'confirmation',
                },
            },
        },

        confirmation: {
            meta: {
                test: async (
                    { screen: rootScreen }: TestingContext,
                    state: ExportToMtvMachineState,
                ) => {
                    const { roomName } = state.context;
                    invariant(
                        typeof roomName === 'string',
                        'roomName must have been set before being on confirmation screen',
                    );
                    const screen = within(
                        await rootScreen.findByTestId(
                            'mtv-room-creation-confirmation-step',
                        ),
                    );

                    const confirmationScreenTitle = screen.getByText(
                        /confirm.*room.*creation/i,
                    );
                    expect(confirmationScreenTitle).toBeTruthy();

                    expect(screen.getByText(/name.*room/i)).toBeTruthy();
                    expect(screen.getByText(roomName)).toBeTruthy();

                    expect(
                        screen.getByText(/opening.*status.*room/i),
                    ).toBeTruthy();

                    // Room is public
                    expect(screen.getByText(/public/i)).toBeTruthy();

                    expect(
                        screen.getByText(/only.*invited.*users.*vote/i),
                    ).toBeTruthy();
                    // All users can vote
                    expect(screen.getAllByText(/no/i).length).toBeGreaterThan(
                        0,
                    );

                    expect(
                        screen.getByText(/has.*physical.*constraints/i),
                    ).toBeTruthy();
                    // Has no physical constraints
                    expect(screen.getAllByText(/no/i).length).toBeGreaterThan(
                        0,
                    );

                    expect(screen.getByText(/playing.*mode/i)).toBeTruthy();
                    expect(screen.getByText('BROADCAST')).toBeTruthy();

                    expect(screen.getByText(/minimum.*score/i)).toBeTruthy();
                    expect(screen.getByText('1')).toBeTruthy();
                },
            },

            on: {
                GO_NEXT: [
                    {
                        target: 'fullScreenPlayerLoadedWithExportedRoom',
                    },
                ],
            },
        },

        fullScreenPlayerLoadedWithExportedRoom: {
            type: 'final',

            meta: {
                test: async (
                    { screen }: TestingContext,
                    { context: { roomName } }: ExportToMtvMachineState,
                ) => {
                    invariant(
                        typeof roomName === 'string',
                        'roomName must have been set before confirming exporting',
                    );

                    await waitFor(() => {
                        const confirmationScreen = screen.queryByTestId(
                            'mtv-room-creation-confirmation-step',
                        );
                        expect(confirmationScreen).toBeNull();
                    });

                    const musicPlayerMini =
                        screen.getByTestId('music-player-mini');
                    expect(musicPlayerMini).toBeTruthy();

                    await waitFor(() => {
                        expect(
                            within(musicPlayerMini).getByText(roomName),
                        ).toBeTruthy();
                    });

                    const musicPlayerFullScreen = await screen.findByA11yState({
                        expanded: true,
                    });
                    expect(musicPlayerFullScreen).toBeTruthy();
                    expect(
                        within(musicPlayerFullScreen).getByText(roomName),
                    ).toBeTruthy();
                },
            },
        },

        wentBackFromRoomNameScreen: {
            type: 'final',

            meta: {
                test: async ({ screen }: TestingContext) => {
                    await waitFor(() => {
                        const roomNameScreenTitle =
                            screen.queryByText(/what.*is.*name.*room/i);
                        expect(roomNameScreenTitle).toBeNull();
                    });

                    // FIXME: In the future we would like to be redirected to the exported room screen.
                    await waitFor(() => {
                        expect(
                            screen.getAllByText(/home/i).length,
                        ).toBeGreaterThanOrEqual(1);
                    });

                    // FIXME: In the future we would like the full-screen player to be open.
                    const musicPlayerFullScreen = screen.queryByA11yState({
                        expanded: true,
                    });
                    expect(musicPlayerFullScreen).toBeNull();
                },
            },
        },
    },
});

const exportToMtvTestModel = createTestModel<
    TestingContext,
    ContextFrom<typeof exportToMtvMachine>
>(exportToMtvMachine).withEvents({
    LOAD_MTV_ROOM: {
        exec: (_, _event) => {
            const { roomName } = _event as EventFrom<
                typeof exportToMtvMachine,
                'LOAD_MTV_ROOM'
            >;

            const mtvRoomState = generateMtvWorklowState({
                userType: 'CREATOR',
                overrides: {
                    name: roomName,
                },
            });
            serverSocket.emit('MTV_RETRIEVE_CONTEXT', mtvRoomState);
        },

        cases: [
            {
                roomName: random.words(),
            } as Omit<
                EventFrom<typeof exportToMtvMachine, 'LOAD_MTV_ROOM'>,
                'type'
            >,
        ],
    },

    GO_TO_LIBRARY: async ({ screen }) => {
        const libraryScreenLink = await screen.findByText(/^library$/i);

        fireEvent.press(libraryScreenLink);
    },

    GO_TO_MPE_ROOM: async ({ screen, fakeMpeRoom }) => {
        const mpeRoomScreenTitle = await screen.findByText(
            fakeMpeRoom.roomName,
        );

        fireEvent.press(mpeRoomScreenTitle);
    },

    EXPORT_TO_MTV: async ({ screen }) => {
        await openMpeSettingsBottomSheetModal({
            screen,
        });

        const exportToMtvButton = await screen.findByText(/export.*mtv/i);

        fireEvent.press(exportToMtvButton);
    },

    SET_ROOM_NAME_AND_GO_NEXT: {
        exec: async ({ screen }, _event) => {
            const { roomName: roomNameToType } = _event as EventFrom<
                typeof exportToMtvModel,
                'SET_ROOM_NAME_AND_GO_NEXT'
            >;

            const roomNameInput = await screen.findByPlaceholderText(
                /Room.*name/i,
            );

            fireEvent.changeText(roomNameInput, roomNameToType);

            // All previous screen remain in memory.
            // We need to keep the next button of the last shown screen.
            const goNextButtons = screen.getAllByText(/next/i);
            const goNextButton = goNextButtons[goNextButtons.length - 1];

            fireEvent.press(goNextButton);
        },

        cases: [
            {
                roomName: random.words(),
            } as Omit<
                EventFrom<typeof exportToMtvModel, 'SET_ROOM_NAME_AND_GO_NEXT'>,
                'type'
            >,
        ],
    },

    GO_NEXT: ({ screen }) => {
        // All previous screen remain in memory.
        // We need to keep the next button of the last shown screen.
        const goNextButtons = screen.getAllByText(/next/i);
        const goNextButton = goNextButtons[goNextButtons.length - 1];

        fireEvent.press(goNextButton);
    },

    GO_BACK: ({ screen }) => {
        const goBackButton = screen.getByText(/back/i);

        fireEvent.press(goBackButton);
    },
});

describe('Export MPE room to MTV room', () => {
    const testPlans = exportToMtvTestModel.getSimplePathPlansTo((state) => {
        const isFinalState = state.done === true;

        return isFinalState === true;
    });

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    const fakeMpeRoom = db.searchableMpeRooms.create();
                    const { roomID, roomName } = fakeMpeRoom;
                    const fakeRoomState = generateMpeWorkflowState({
                        roomID,
                        name: roomName,
                        isOpen: true,
                        isOpenOnlyInvitedUsersCanEdit: false,
                    });

                    serverSocket.on('MPE_GET_CONTEXT', ({ roomID }) => {
                        serverSocket.emit('MPE_GET_CONTEXT_SUCCESS_CALLBACK', {
                            roomID,
                            state: fakeRoomState,
                            userIsNotInRoom: false,
                        });
                    });

                    serverSocket.on('MPE_EXPORT_TO_MTV', (args) => {
                        const createdMtvRoomState = generateMtvWorklowState({
                            userType: 'CREATOR',
                            overrides: args.mtvRoomOptions,
                        });

                        serverSocket.emit('MTV_LEAVE_ROOM_CALLBACK');

                        setTimeout(() => {
                            serverSocket.emit(
                                'MTV_CREATE_ROOM_SYNCHED_CALLBACK',
                                createdMtvRoomState,
                            );
                        }, 10);

                        setTimeout(() => {
                            serverSocket.emit(
                                'MTV_CREATE_ROOM_CALLBACK',
                                createdMtvRoomState,
                            );
                        }, 20);
                    });

                    const screen = await renderApp();

                    await path.test({ screen, fakeMpeRoom });
                });
            });
        });
    });

    it('should have full coverage', () => {
        exportToMtvTestModel.testCoverage();
    });
});
