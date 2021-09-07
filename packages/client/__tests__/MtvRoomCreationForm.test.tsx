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
                                ).toBeFalsy();
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
                type: 'final',

                meta: {
                    test: async ({ screen }: TestingContext) => {
                        const physicalConstraintsScreenTitle =
                            await screen.findByText(
                                /want.*restrict.*voting.*physical.*constraints/i,
                            );
                        expect(physicalConstraintsScreenTitle).toBeTruthy();
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

            // fireEvent(roomNameInput, 'focus');
            fireEvent.changeText(roomNameInput, roomNameToType);
            // fireEvent(roomNameInput, 'submitEditing');

            const goNextButtons = screen.getAllByText(/next/i);
            const goNextButton = goNextButtons[goNextButtons.length - 1];

            fireEvent.press(goNextButton);

            // try {
            //     await waitForElementToBeRemoved(() =>
            //         screen.getByText(/what.*is.*name.*room/i),
            //     );
            // } catch (err) {
            //     console.error(err);

            //     screen.debug();

            //     throw err;
            // }
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
