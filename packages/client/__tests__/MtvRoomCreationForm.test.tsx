import React from 'react';
import { createModel as createTestModel } from '@xstate/test';
import { createModel } from 'xstate/lib/model';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from '../navigation';
import { fireEvent, noop, render } from '../tests/tests-utils';
import { ContextFrom } from 'xstate';
import * as z from 'zod';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';

const createMtvRoomWithSettingsModel = createModel(
    {},
    {
        events: {
            CLICK_GO_TO_MTV_ROOM_CREATION_FORM: () => ({}),

            SET_ROOM_NAME_AND_GO_NEXT: (roomName: string) => ({
                value: roomName,
            }),

            SET_OPENING_STATUS: (isOpen: boolean) => ({ isOpen }),

            SET_ONLY_INVITED_USERS_CAN_VOTE: () => ({}),

            SET_PHYSICAL_CONSTRAINTS_STATUS: (
                hasPhysicalConstraints: boolean,
            ) => ({ hasPhysicalConstraints }),

            SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT: (
                args: SetPhysicalConstraintsValuesEvent,
            ) => args,

            SET_PLAYING_MODE_STATUS: (status: 'BROADCAST' | 'DIRECT') => ({
                status,
            }),

            GO_BACK: () => ({}),

            GO_NEXT: () => ({}),
        },
    },
);

const createMtvRoomWithSettingsMachine =
    createMtvRoomWithSettingsModel.createMachine({
        id: 'createMtvRoomWithSettings',

        initial: 'home',

        states: {
            home: {
                meta: {
                    test: ({ screen }: TestingContext) => {
                        expect(
                            screen.getAllByText(/home/i).length,
                        ).toBeGreaterThanOrEqual(1);
                    },
                },

                on: {
                    CLICK_GO_TO_MTV_ROOM_CREATION_FORM: {
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

                    SET_ROOM_NAME_AND_GO_NEXT: [
                        {
                            cond: (_context, { value }) => {
                                const isEmptyRoomName = value === '';
                                const isNotEmptyRoomName = !isEmptyRoomName;

                                return isNotEmptyRoomName;
                            },

                            target: 'openingStatus',
                        },
                    ],
                },
            },

            openingStatus: {
                initial: 'isPublic',

                states: {
                    isPublic: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedOpeningStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedOpeningStatusOption,
                                ).toHaveTextContent(/public/i);

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
                                    test: ({ screen }: TestingContext) => {
                                        const votingSwitch =
                                            screen.getByRole('switch');

                                        expect(votingSwitch).toHaveProp(
                                            'value',
                                            false,
                                        );
                                    },
                                },
                            },

                            hasVotingConstraint: {
                                meta: {
                                    test: ({ screen }: TestingContext) => {
                                        const votingSwitch =
                                            screen.getByRole('switch');

                                        expect(votingSwitch).toHaveProp(
                                            'value',
                                            true,
                                        );
                                    },
                                },
                            },
                        },

                        on: {
                            SET_ONLY_INVITED_USERS_CAN_VOTE: {
                                target: '.hasVotingConstraint',
                            },
                        },
                    },

                    isPrivate: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedOpeningStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedOpeningStatusOption,
                                ).toHaveTextContent(/private/i);

                                const unknownVotingConstraintSwitch =
                                    screen.queryByRole('switch');
                                expect(
                                    unknownVotingConstraintSwitch,
                                ).toBeNull();
                            },
                        },
                    },
                },

                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const openingStatusScreenTitle =
                            await screen.findByText(
                                /what.*is.*opening.*status.*room/i,
                            );
                        expect(openingStatusScreenTitle).toBeTruthy();
                    },
                },

                on: {
                    SET_OPENING_STATUS: [
                        {
                            cond: (_context, { isOpen }) => isOpen === true,

                            target: '.isPublic',
                        },

                        {
                            target: '.isPrivate',
                        },
                    ],

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

                initial: 'hasNoPhysicalConstraints',

                states: {
                    hasNoPhysicalConstraints: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedPhysicalConstraintsStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedPhysicalConstraintsStatusOption,
                                ).toHaveTextContent(/^no.*restriction$/i);
                            },
                        },

                        on: {
                            GO_NEXT: {
                                target: '#playingMode',
                            },
                        },
                    },

                    hasPhysicalConstraints: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedPhysicalConstraintsStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedPhysicalConstraintsStatusOption,
                                ).toHaveTextContent(/^restrict$/i);
                            },
                        },

                        on: {
                            SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT: {
                                target: '#playingMode',
                            },
                        },
                    },
                },

                on: {
                    SET_PHYSICAL_CONSTRAINTS_STATUS: [
                        {
                            cond: (_context, { hasPhysicalConstraints }) =>
                                hasPhysicalConstraints === true,

                            target: '.hasPhysicalConstraints',
                        },

                        {
                            target: '.hasNoPhysicalConstraints',
                        },
                    ],
                },
            },

            playingMode: {
                id: 'playingMode',

                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const playingModeScreenTitle = await screen.findByText(
                            /which.*playing.*mode/i,
                        );
                        expect(playingModeScreenTitle).toBeTruthy();
                    },
                },

                initial: 'broadcast',

                states: {
                    broadcast: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedPlayingModeStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedPlayingModeStatusOption,
                                ).toHaveTextContent(/^broadcast$/i);
                            },
                        },
                    },

                    direct: {
                        meta: {
                            test: async ({ screen }: TestingContext) => {
                                const selectedElementsOnScreen =
                                    await screen.findAllByA11yState({
                                        selected: true,
                                    });

                                const selectedPlayingModeStatusOption =
                                    selectedElementsOnScreen[1];
                                expect(
                                    selectedPlayingModeStatusOption,
                                ).toHaveTextContent(/^direct$/i);
                            },
                        },
                    },
                },

                on: {
                    SET_PLAYING_MODE_STATUS: [
                        {
                            cond: (_context, { status }) =>
                                status === 'BROADCAST',

                            target: '.broadcast',
                        },

                        {
                            cond: (_context, { status }) => status === 'DIRECT',

                            target: '.direct',
                        },
                    ],

                    GO_NEXT: {
                        target: 'votesConstraints',
                    },
                },
            },

            votesConstraints: {
                type: 'final',

                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const votesConstraitsScreenTitle =
                            await screen.findByText(
                                /how.*many.*votes.*song.*played/i,
                            );
                        expect(votesConstraitsScreenTitle).toBeTruthy();
                    },
                },
            },
        },
    });

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const TypeRoomNameEvent = z
    .object({
        value: z.string(),
    })
    .nonstrict();
type TypeRoomNameEvent = z.infer<typeof TypeRoomNameEvent>;

const SetOpeningStatusEvent = z
    .object({
        isOpen: z.boolean(),
    })
    .nonstrict();
type SetOpeningStatusEvent = z.infer<typeof SetOpeningStatusEvent>;

const SetPhysicalConstraintsStatusEvent = z
    .object({
        hasPhysicalConstraints: z.boolean(),
    })
    .nonstrict();
type SetPhysicalConstraintsStatusEvent = z.infer<
    typeof SetPhysicalConstraintsStatusEvent
>;

const SetPlayingModeStatusEvent = z
    .object({
        status: z.enum(['BROADCAST', 'DIRECT']),
    })
    .nonstrict();
type SetPlayingModeStatusEvent = z.infer<typeof SetPlayingModeStatusEvent>;

const SetPhysicalConstraintsValuesEvent = z
    .object({
        place: z.string(),
        radius: z.number(),
        startsAt: z.string(),
        endsAt: z.string(),
    })
    .nonstrict();
type SetPhysicalConstraintsValuesEvent = z.infer<
    typeof SetPhysicalConstraintsValuesEvent
>;

const createMtvRoomWithSettingsTestModel = createTestModel<
    TestingContext,
    ContextFrom<typeof createMtvRoomWithSettingsMachine>
>(createMtvRoomWithSettingsMachine).withEvents({
    CLICK_GO_TO_MTV_ROOM_CREATION_FORM: ({ screen }) => {
        const openMtvRoomCreationFormButton = screen.getByText(
            /open.*mtv.*room.*creation.*form/i,
        );

        fireEvent.press(openMtvRoomCreationFormButton);
    },

    SET_ROOM_NAME_AND_GO_NEXT: {
        exec: async ({ screen }, event) => {
            const { value: roomNameToType } = TypeRoomNameEvent.parse(event);
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
                value: 'Biolay Fans',
            } as TypeRoomNameEvent,
        ],
    },

    SET_OPENING_STATUS: {
        exec: ({ screen }, event) => {
            const { isOpen } = SetOpeningStatusEvent.parse(event);

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
            } as SetOpeningStatusEvent,

            {
                isOpen: false,
            } as SetOpeningStatusEvent,
        ],
    },

    SET_ONLY_INVITED_USERS_CAN_VOTE: ({ screen }) => {
        const votingSwitch = screen.getByRole('switch');

        fireEvent(votingSwitch, 'valueChange', true);
    },

    SET_PHYSICAL_CONSTRAINTS_STATUS: {
        exec: ({ screen }, event) => {
            const { hasPhysicalConstraints } =
                SetPhysicalConstraintsStatusEvent.parse(event);

            switch (hasPhysicalConstraints) {
                case true: {
                    const hasPhysicalConstraintsButton =
                        screen.getByText(/^restrict$/i);

                    fireEvent.press(hasPhysicalConstraintsButton);

                    break;
                }

                case false: {
                    const hasNoPhysicalConstraintsButton =
                        screen.getByText(/^no.*restriction$/i);

                    fireEvent.press(hasNoPhysicalConstraintsButton);

                    break;
                }

                default: {
                    throw new Error('Reached unreachable state');
                }
            }
        },

        cases: [
            {
                hasPhysicalConstraints: true,
            } as SetPhysicalConstraintsStatusEvent,

            {
                hasPhysicalConstraints: false,
            } as SetPhysicalConstraintsStatusEvent,
        ],
    },

    SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT: {
        exec: async ({ screen }, event) => {
            const { place, radius, startsAt, endsAt } =
                SetPhysicalConstraintsValuesEvent.parse(event);
            const placeInput = await screen.findByPlaceholderText(/place/i);
            const radiusInput = screen.getByPlaceholderText(/radius/i);
            const startsAtInput = screen.getByPlaceholderText(/starts.*at/i);
            const endsAtInput = screen.getByPlaceholderText(/ends.*at/i);

            fireEvent.changeText(placeInput, place);
            fireEvent.changeText(radiusInput, radius);
            fireEvent.changeText(startsAtInput, startsAt);
            fireEvent.changeText(endsAtInput, endsAt);

            const goNextButtons = screen.getAllByText(/next/i);
            const goNextButton = goNextButtons[goNextButtons.length - 1];

            fireEvent.press(goNextButton);
        },

        cases: [
            {
                place: '96 Boulevard Bessières, Paris',
                radius: 10,
                startsAt: '09/08/2021 10:10:00',
                endsAt: '10/08/2021 10:10:00',
            } as SetPhysicalConstraintsValuesEvent,
        ],
    },

    SET_PLAYING_MODE_STATUS: {
        exec: ({ screen }, event) => {
            const { status } = SetPlayingModeStatusEvent.parse(event);

            switch (status) {
                case 'BROADCAST': {
                    const broadcastPlayingModeButton =
                        screen.getByText(/^broadcast$/i);

                    fireEvent.press(broadcastPlayingModeButton);

                    break;
                }

                case 'DIRECT': {
                    const directPlayingModeButton =
                        screen.getByText(/^direct$/i);

                    fireEvent.press(directPlayingModeButton);

                    break;
                }

                default: {
                    throw new Error('Reached unreachable state');
                }
            }
        },

        cases: [
            {
                status: 'BROADCAST',
            } as SetPlayingModeStatusEvent,

            {
                status: 'DIRECT',
            } as SetPlayingModeStatusEvent,
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

describe('Create mtv room with custom settings', () => {
    const testPlans = createMtvRoomWithSettingsTestModel.getSimplePathPlans();

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    const screen = render(
                        <NavigationContainer
                            ref={navigationRef}
                            onReady={() => {
                                isReadyRef.current = true;
                            }}
                        >
                            <RootNavigator
                                colorScheme="dark"
                                toggleColorScheme={noop}
                            />
                        </NavigationContainer>,
                    );

                    await path.test({
                        screen,
                    });
                });
            });
        });
    });

    it('should have full coverage', () => {
        createMtvRoomWithSettingsTestModel.testCoverage();
    });
});
