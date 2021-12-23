import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import { ContextFrom, EventFrom, State } from 'xstate';
import { datatype } from 'faker';
import { MpeWorkflowState } from '@musicroom/types';
import {
    render,
    renderApp,
    waitFor,
    fireEvent,
    within,
} from '../../../tests/tests-utils';
import { db } from '../../../tests/data';
import { serverSocket } from '../../../services/websockets';

interface TestingContext {
    screen: ReturnType<typeof render>;
    fakeTrack: ReturnType<typeof db.searchableTracks.create>;
}

const createMpeRoomWithSettingsModel = createModel(
    {
        roomName: '',
        isOpen: true,
        onlyInvitedUsersCanEdit: false,
    },
    {
        events: {
            GO_TO_SEARCH_TRACKS: () => ({}),
            TYPE_SEARCH_TRACK_QUERY_AND_SUBMIT: () => ({}),
            PRESS_SEARCH_TRACK_QUERY_RESULT: () => ({}),
            SET_ROOM_NAME_AND_GO_NEXT: (args: { roomName: string }) => args,
            SET_ONLY_INVITED_USERS_CAN_EDIT: (args: {
                onlyInvitedUsersCanEdit: boolean;
            }) => args,
            SET_OPENING_STATUS: (args: { isOpen: boolean }) => args,
            GO_BACK: () => ({}),
            GO_NEXT: () => ({}),
        },
    },
);

type CreateMpeRoomWithSettingsMachineContext = ContextFrom<
    typeof createMpeRoomWithSettingsModel
>;
type CreateMpeRoomWithSettingsMachineEvent = EventFrom<
    typeof createMpeRoomWithSettingsModel
>;

type CreateMpeRoomWithSettingsMachineState = State<
    CreateMpeRoomWithSettingsMachineContext,
    CreateMpeRoomWithSettingsMachineEvent
>;

const assignOnlyInvitedUsersCanEditToContext =
    createMpeRoomWithSettingsModel.assign(
        {
            onlyInvitedUsersCanEdit: (_context, { onlyInvitedUsersCanEdit }) =>
                onlyInvitedUsersCanEdit,
        },
        'SET_ONLY_INVITED_USERS_CAN_EDIT',
    );

const resetOnlyInvitedUsersCanEditToContext =
    createMpeRoomWithSettingsModel.assign(
        {
            onlyInvitedUsersCanEdit:
                createMpeRoomWithSettingsModel.initialContext
                    .onlyInvitedUsersCanEdit,
        },
        undefined,
    );

const assignOpeningStatusToContext = createMpeRoomWithSettingsModel.assign(
    {
        isOpen: (_context, { isOpen }) => isOpen,
    },
    'SET_OPENING_STATUS',
);

const createMpeRoomWithSettingsMachine =
    createMpeRoomWithSettingsModel.createMachine({
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
                    GO_TO_SEARCH_TRACKS: {
                        target: 'searchTracks',
                    },
                },
            },

            searchTracks: {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        await waitFor(() =>
                            expect(
                                screen.getByText(/search.*track/i),
                            ).toBeTruthy(),
                        );
                    },
                },

                on: {
                    TYPE_SEARCH_TRACK_QUERY_AND_SUBMIT: {
                        target: 'searchTracksResults',
                    },
                },
            },

            searchTracksResults: {
                meta: {
                    test: async ({ screen, fakeTrack }: TestingContext) => {
                        const trackResultListItem = await screen.findByText(
                            fakeTrack.title,
                        );
                        expect(trackResultListItem).toBeTruthy();
                    },
                },

                on: {
                    PRESS_SEARCH_TRACK_QUERY_RESULT: {
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
                    GO_BACK: {
                        target: 'home',
                    },

                    SET_ROOM_NAME_AND_GO_NEXT: {
                        cond: (_context, { roomName }) => {
                            const isEmptyRoomName = roomName === '';
                            const isNotEmptyRoomName = !isEmptyRoomName;

                            return isNotEmptyRoomName;
                        },

                        target: 'openingStatus',

                        actions: createMpeRoomWithSettingsModel.assign({
                            roomName: (_, { roomName }) => roomName,
                        }),
                    },
                },
            },

            openingStatus: {
                initial: 'isPublic',

                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const openingStatusScreenTitle =
                            await screen.findByText(
                                /what.*is.*opening.*status.*room/i,
                            );
                        expect(openingStatusScreenTitle).toBeTruthy();
                    },
                },

                states: {
                    isPublic: {
                        entry: resetOnlyInvitedUsersCanEditToContext,

                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                await waitFor(() => {
                                    const selectedElementsOnScreen =
                                        screen.getAllByA11yState({
                                            selected: true,
                                        });

                                    const selectedOpeningStatusOption =
                                        selectedElementsOnScreen[
                                            selectedElementsOnScreen.length - 1
                                        ];
                                    expect(
                                        selectedOpeningStatusOption,
                                    ).toHaveTextContent(/public/i);
                                });

                                const votingConstraintTitle = screen.getByText(
                                    /allow.*only.*invited.*users.*vote/i,
                                );
                                expect(votingConstraintTitle).toBeTruthy();

                                const votingSwitch = screen.getByRole('switch');
                                expect(votingSwitch).toBeTruthy();
                            },
                        },

                        initial: 'hasNoVotingConstraint',

                        states: {
                            hasNoVotingConstraint: {
                                meta: {
                                    test: async ({
                                        screen,
                                    }: TestingContext) => {
                                        await waitFor(() => {
                                            const votingSwitch =
                                                screen.getByRole('switch');

                                            expect(votingSwitch).toHaveProp(
                                                'value',
                                                false,
                                            );
                                        });
                                    },
                                },
                            },

                            hasVotingConstraint: {
                                meta: {
                                    test: async ({
                                        screen,
                                    }: TestingContext) => {
                                        await waitFor(() => {
                                            const votingSwitch =
                                                screen.getByRole('switch');

                                            expect(votingSwitch).toHaveProp(
                                                'value',
                                                true,
                                            );
                                        });
                                    },
                                },
                            },
                        },

                        on: {
                            SET_ONLY_INVITED_USERS_CAN_EDIT: [
                                {
                                    cond: (_, { onlyInvitedUsersCanEdit }) =>
                                        onlyInvitedUsersCanEdit === true,

                                    target: '.hasVotingConstraint',

                                    actions:
                                        assignOnlyInvitedUsersCanEditToContext,
                                },

                                {
                                    target: '.hasNoVotingConstraint',

                                    actions:
                                        assignOnlyInvitedUsersCanEditToContext,
                                },
                            ],

                            SET_OPENING_STATUS: {
                                cond: (_context, { isOpen }) =>
                                    isOpen === false,

                                target: 'isPrivate',

                                actions: assignOpeningStatusToContext,
                            },
                        },
                    },

                    isPrivate: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                await waitFor(() => {
                                    const selectedElementsOnScreen =
                                        screen.getAllByA11yState({
                                            selected: true,
                                        });

                                    const selectedOpeningStatusOption =
                                        selectedElementsOnScreen[
                                            selectedElementsOnScreen.length - 1
                                        ];
                                    expect(
                                        selectedOpeningStatusOption,
                                    ).toHaveTextContent(/private/i);
                                });

                                const unknownVotingConstraintSwitch =
                                    screen.queryByRole('switch');
                                expect(
                                    unknownVotingConstraintSwitch,
                                ).toBeNull();
                            },
                        },

                        on: {
                            SET_OPENING_STATUS: {
                                cond: (_context, { isOpen }) => isOpen === true,

                                target: 'isPublic',

                                actions: assignOpeningStatusToContext,
                            },
                        },
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
                        state: CreateMpeRoomWithSettingsMachineState,
                    ) => {
                        const { roomName, isOpen, onlyInvitedUsersCanEdit } =
                            state.context;
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
                        switch (isOpen) {
                            case true: {
                                expect(
                                    screen.getByText(/public/i),
                                ).toBeTruthy();

                                expect(
                                    screen.getByText(
                                        /only.*invited.*users.*vote/i,
                                    ),
                                ).toBeTruthy();

                                switch (onlyInvitedUsersCanEdit) {
                                    case true: {
                                        expect(
                                            screen.getAllByText(/yes/i).length,
                                        ).toBeGreaterThan(0);

                                        break;
                                    }

                                    case false: {
                                        expect(
                                            screen.getAllByText(/no/i).length,
                                        ).toBeGreaterThan(0);

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
                                expect(
                                    screen.getByText(/private/i),
                                ).toBeTruthy();

                                break;
                            }

                            default: {
                                throw new Error('Reached unreachable state');
                            }
                        }
                    },
                },

                on: {
                    GO_NEXT: {
                        target: 'createdRoom',
                    },
                },
            },

            createdRoom: {
                type: 'final',

                meta: {
                    test: async (
                        { screen, fakeTrack }: TestingContext,
                        state: CreateMpeRoomWithSettingsMachineState,
                    ) => {
                        const { roomName } = state.context;

                        const confirmationStepScreenTitle = screen.queryByText(
                            /confirm.*room.*creation/i,
                        );
                        expect(confirmationStepScreenTitle).toBeNull();

                        const roomCardElement = await waitFor(() => {
                            const roomCard = screen.getByText(roomName);
                            expect(roomCard).toBeTruthy();

                            return roomCard;
                        });

                        fireEvent.press(roomCardElement);

                        const roomScreen = await screen.findByTestId(
                            /^mpe-room-screen-(.*)/i,
                        );
                        expect(roomScreen).toBeTruthy();

                        await waitFor(() => {
                            const playlistScreenTitle = within(
                                roomScreen,
                            ).getByText(
                                new RegExp(`playlist.*${roomName}`, 'i'),
                            );
                            expect(playlistScreenTitle).toBeTruthy();
                        });

                        await waitFor(() => {
                            const trackInMpeRoomScreen = within(
                                roomScreen,
                            ).getByText(fakeTrack.title);
                            expect(trackInMpeRoomScreen).toBeTruthy();
                        });
                    },
                },
            },
        },
    });

const createMpeRoomWithSettingsTestModel = createTestModel<
    TestingContext,
    ContextFrom<typeof createMpeRoomWithSettingsMachine>
>(createMpeRoomWithSettingsMachine).withEvents({
    GO_TO_SEARCH_TRACKS: ({ screen }) => {
        const searchScreenLink = screen.getByText(/^search$/i);

        fireEvent.press(searchScreenLink);
    },

    TYPE_SEARCH_TRACK_QUERY_AND_SUBMIT: ({ screen, fakeTrack }) => {
        const searchInput = screen.getByPlaceholderText(/search.*track/i);

        const SEARCH_QUERY = fakeTrack.title.slice(0, 3);

        /**
         * To simulate a real interaction with a text input, we need to:
         * 1. Focus it
         * 2. Change its text
         * 3. Submit the changes
         */
        fireEvent(searchInput, 'focus');
        fireEvent.changeText(searchInput, SEARCH_QUERY);
        fireEvent(searchInput, 'submitEditing');
    },

    PRESS_SEARCH_TRACK_QUERY_RESULT: async ({ screen, fakeTrack }) => {
        const trackResultListItem = await screen.findByText(fakeTrack.title);

        fireEvent.press(trackResultListItem);

        const creationModal = await screen.findByText(/what.*to.*do.*track/i);
        expect(creationModal).toBeTruthy();

        const createMpeRoomButton = screen.getByText(/create.*mpe/i);
        expect(createMpeRoomButton).toBeTruthy();

        fireEvent.press(createMpeRoomButton);
    },

    SET_ROOM_NAME_AND_GO_NEXT: {
        exec: async ({ screen }, _event) => {
            const { roomName: roomNameToType } = _event as EventFrom<
                typeof createMpeRoomWithSettingsModel,
                'SET_ROOM_NAME_AND_GO_NEXT'
            >;

            const roomNameInput = await screen.findByPlaceholderText(
                /francis.*cabrel.*onlyfans/i,
            );

            fireEvent.changeText(roomNameInput, roomNameToType);

            const goNextButtons = screen.getAllByText(/next/i);
            const goNextButton = goNextButtons[goNextButtons.length - 1];

            fireEvent.press(goNextButton);
        },

        cases: [
            {
                roomName: 'Biolay Fans',
            } as Omit<
                EventFrom<
                    typeof createMpeRoomWithSettingsModel,
                    'SET_ROOM_NAME_AND_GO_NEXT'
                >,
                'type'
            >,
        ],
    },

    SET_OPENING_STATUS: {
        exec: ({ screen }, _event) => {
            const { isOpen } = _event as EventFrom<
                typeof createMpeRoomWithSettingsModel,
                'SET_OPENING_STATUS'
            >;

            switch (isOpen) {
                case true: {
                    const publicButton = screen.getByText(/public/i);

                    fireEvent.press(publicButton);

                    break;
                }

                case false: {
                    const privateButton = screen.getByText(/private/i);

                    fireEvent.press(privateButton);

                    break;
                }

                default:
                    throw new Error('Reached unreachable state');
            }
        },

        cases: [
            {
                isOpen: true,
            } as Omit<
                EventFrom<
                    typeof createMpeRoomWithSettingsModel,
                    'SET_OPENING_STATUS'
                >,
                'type'
            >,

            {
                isOpen: false,
            } as Omit<
                EventFrom<
                    typeof createMpeRoomWithSettingsModel,
                    'SET_OPENING_STATUS'
                >,
                'type'
            >,
        ],
    },

    SET_ONLY_INVITED_USERS_CAN_EDIT: {
        exec: ({ screen }, _event) => {
            const { onlyInvitedUsersCanEdit } = _event as EventFrom<
                typeof createMpeRoomWithSettingsModel,
                'SET_ONLY_INVITED_USERS_CAN_EDIT'
            >;

            const votingSwitch = screen.getByRole('switch');

            fireEvent(votingSwitch, 'valueChange', onlyInvitedUsersCanEdit);
        },

        cases: [
            {
                onlyInvitedUsersCanEdit: true,
            } as Omit<
                EventFrom<
                    typeof createMpeRoomWithSettingsModel,
                    'SET_ONLY_INVITED_USERS_CAN_EDIT'
                >,
                'type'
            >,

            {
                onlyInvitedUsersCanEdit: false,
            } as Omit<
                EventFrom<
                    typeof createMpeRoomWithSettingsModel,
                    'SET_ONLY_INVITED_USERS_CAN_EDIT'
                >,
                'type'
            >,
        ],
    },

    GO_BACK: ({ screen }) => {
        const goBackButton = screen.getByText(/back/i);

        fireEvent.press(goBackButton);
    },

    GO_NEXT: ({ screen }) => {
        // All previous screen remain in memory.
        // We need to keep the next button of the last shown screen.
        const goNextButtons = screen.getAllByText(/next/i);
        const goNextButton = goNextButtons[goNextButtons.length - 1];

        fireEvent.press(goNextButton);
    },
});

describe('Create MPE room with custom settings', () => {
    const testPlans = createMpeRoomWithSettingsTestModel.getSimplePathPlansTo(
        (state) => {
            const isFinalState = state.done === true;

            return isFinalState === true;
        },
    );

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    const fakeTrack = db.searchableTracks.create();
                    const userID = datatype.uuid();

                    serverSocket.on(
                        'MPE_CREATE_ROOM',
                        ({
                            name,
                            isOpen,
                            isOpenOnlyInvitedUsersCanEdit,
                            initialTrackID,
                        }) => {
                            expect(initialTrackID).toBe(fakeTrack.id);

                            const roomState: MpeWorkflowState = {
                                name,
                                isOpen,
                                isOpenOnlyInvitedUsersCanEdit,
                                tracks: [fakeTrack],
                                playlistTotalDuration: 42000,
                                roomCreatorUserID: userID,
                                roomID: datatype.uuid(),
                                usersLength: 1,
                            };

                            serverSocket.emit(
                                'MPE_CREATE_ROOM_SYNCED_CALLBACK',
                                roomState,
                            );

                            setImmediate(() => {
                                serverSocket.emit(
                                    'MPE_CREATE_ROOM_CALLBACK',
                                    roomState,
                                );
                            });
                        },
                    );

                    const screen = await renderApp();

                    await path.test({
                        fakeTrack,
                        screen,
                    });
                });
            });
        });
    });

    it('should have full coverage', () => {
        createMpeRoomWithSettingsTestModel.testCoverage();
    });
});
