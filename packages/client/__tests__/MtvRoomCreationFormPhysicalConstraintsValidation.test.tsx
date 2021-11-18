import React from 'react';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import * as z from 'zod';
import {
    addHours,
    addMinutes,
    isAfter,
    isBefore,
    isEqual,
    setMilliseconds,
    setSeconds,
    subDays,
} from 'date-fns';
import {
    fireEvent,
    noop,
    render,
    waitFor,
    within,
    waitForElementToBeRemoved,
} from '../tests/tests-utils';
import {
    MusicTrackVoteCreationFormPhysicalConstraintsContent,
    MusicTrackVoteCreationFormPhysicalConstraintsFormFieldValues,
} from '../screens/MusicTrackVoteCreationFormPhysicalConstraints';

const TEST_TIMESTAMP = setMilliseconds(setSeconds(new Date(), 0), 0);

interface TestingContext {
    triggerSubmit: () => void;
    submitSpy: jest.Mock<
        void,
        [MusicTrackVoteCreationFormPhysicalConstraintsFormFieldValues]
    >;

    screen: ReturnType<typeof render>;
}

const physicalConstraintsValidationModel = createModel(
    {
        startsAt: new Date(),
    },
    {
        events: {
            TYPE_PLACE_AND_SELECT_FIRST_RESULT: (place: string) => ({ place }),

            SELECT_RADIUS: (radius: number, index: number) => ({
                radius,
                index,
            }),

            SET_STARTS_AT: (startsAt: string) => ({ startsAt }),

            SET_ENDS_AT: (endsAt: string) => ({ endsAt }),

            SUBMIT: () => ({}),
        },
    },
);

const assignStartsAtToContext = physicalConstraintsValidationModel.assign(
    {
        startsAt: (_, { startsAt }) => new Date(startsAt),
    },
    'SET_STARTS_AT',
);

const physicalConstraintsValidationMachine =
    physicalConstraintsValidationModel.createMachine({
        id: 'physicalConstraintsValidation',

        initial: 'idle',

        states: {
            idle: {
                meta: {
                    test: ({ screen }: TestingContext) => {
                        const screenTitle = screen.getByText(
                            /want.*restrict.*voting.*physical.*constraints/i,
                        );
                        expect(screenTitle).toBeTruthy();
                    },
                },

                on: {
                    SUBMIT: {
                        target: 'place',
                    },
                },
            },

            place: {
                meta: {
                    test: async ({ screen, submitSpy }: TestingContext) => {
                        await waitFor(() => {
                            const placeErrorsGroup =
                                screen.getByTestId('place-errors-group');

                            const requiredError =
                                within(placeErrorsGroup).getByRole('alert');
                            expect(requiredError).toBeTruthy();
                            expect(requiredError).toHaveTextContent(
                                /place.*must.*be.*set/i,
                            );
                        });

                        expect(submitSpy).not.toHaveBeenCalled();
                    },
                },

                on: {
                    TYPE_PLACE_AND_SELECT_FIRST_RESULT: {
                        target: 'radius',
                    },
                },
            },

            radius: {
                meta: {
                    test: async ({ screen, submitSpy }: TestingContext) => {
                        await waitFor(() => {
                            const radiusErrorsGroup = screen.getByTestId(
                                'radius-errors-group',
                            );

                            const requiredError =
                                within(radiusErrorsGroup).getByRole('alert');
                            expect(requiredError).toBeTruthy();
                            expect(requiredError).toHaveTextContent(
                                /radius.*must.*be.*set/i,
                            );
                        });

                        expect(submitSpy).not.toHaveBeenCalled();
                    },
                },

                on: {
                    SELECT_RADIUS: [
                        {
                            cond: (_, { radius }) => radius === undefined,

                            target: 'radius',
                        },

                        {
                            target: 'startsAt',
                        },
                    ],
                },
            },

            startsAt: {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        await waitFor(() => {
                            const startsAtErrorsGroup = screen.queryByTestId(
                                'start-at-errors-group',
                            );
                            expect(startsAtErrorsGroup).toBeNull();
                        });
                    },
                },

                on: {
                    SET_STARTS_AT: {
                        target: 'endsAt',

                        actions: assignStartsAtToContext,
                    },
                },
            },

            endsAt: {
                initial: 'init',

                states: {
                    init: {
                        meta: {
                            test: async ({
                                screen,
                                submitSpy,
                            }: TestingContext) => {
                                await waitFor(() => {
                                    const endsAtErrorsGroup =
                                        screen.getByTestId(
                                            'ends-at-errors-group',
                                        );

                                    const requiredError =
                                        within(endsAtErrorsGroup).getByRole(
                                            'alert',
                                        );
                                    expect(requiredError).toBeTruthy();
                                    expect(requiredError).toHaveTextContent(
                                        /event.*end.*date.*must.*after.*beginning/i,
                                    );
                                });

                                expect(submitSpy).not.toHaveBeenCalled();
                            },
                        },
                    },

                    onBeforeStartsAt: {
                        meta: {
                            test: async ({
                                screen,
                                submitSpy,
                            }: TestingContext) => {
                                await waitFor(() => {
                                    const endsAtErrorsGroup =
                                        screen.getByTestId(
                                            'ends-at-errors-group',
                                        );

                                    const requiredError =
                                        within(endsAtErrorsGroup).getByRole(
                                            'alert',
                                        );
                                    expect(requiredError).toBeTruthy();
                                    expect(requiredError).toHaveTextContent(
                                        /event.*end.*date.*must.*after.*beginning/i,
                                    );
                                });

                                expect(submitSpy).not.toHaveBeenCalled();
                            },
                        },
                    },

                    onBeforeOneHourAfterInitialMounting: {
                        meta: {
                            test: async ({
                                screen,
                                submitSpy,
                            }: TestingContext) => {
                                await waitFor(() => {
                                    const endsAtErrorsGroup =
                                        screen.getByTestId(
                                            'ends-at-errors-group',
                                        );

                                    const requiredError =
                                        within(endsAtErrorsGroup).getByRole(
                                            'alert',
                                        );
                                    expect(requiredError).toBeTruthy();
                                    expect(requiredError).toHaveTextContent(
                                        /event.*end.*date.*must.*in.*one.*hour/i,
                                    );
                                });

                                expect(submitSpy).not.toHaveBeenCalled();
                            },
                        },
                    },
                },

                on: {
                    SET_ENDS_AT: [
                        {
                            cond: ({ startsAt }, { endsAt }) => {
                                const isBeforeStartsAt = isBefore(
                                    new Date(endsAt),
                                    startsAt,
                                );

                                return isBeforeStartsAt;
                            },

                            target: 'endsAt.onBeforeStartsAt',
                        },

                        {
                            cond: (_, { endsAt }) => {
                                const endsAtDate = new Date(endsAt);
                                const oneHourAfterInitialMounting = addHours(
                                    TEST_TIMESTAMP,
                                    1,
                                );

                                const isOneHourAfterFormMounting =
                                    isAfter(
                                        endsAtDate,
                                        oneHourAfterInitialMounting,
                                    ) ||
                                    isEqual(
                                        endsAtDate,
                                        oneHourAfterInitialMounting,
                                    );
                                const isNotOneHourAfterFormMounting =
                                    isOneHourAfterFormMounting === false;

                                return isNotOneHourAfterFormMounting;
                            },

                            target: 'endsAt.onBeforeOneHourAfterInitialMounting',
                        },

                        {
                            target: 'fieldsAreValid',
                        },
                    ],
                },
            },

            fieldsAreValid: {
                meta: {
                    test: async ({ screen }: TestingContext) => {
                        await waitFor(() =>
                            expect(screen.queryAllByRole('alert')).toHaveLength(
                                0,
                            ),
                        );
                    },
                },

                on: {
                    SUBMIT: {
                        target: 'success',
                    },
                },
            },

            success: {
                type: 'final',

                meta: {
                    test: async ({ submitSpy }: TestingContext) => {
                        await waitFor(() =>
                            expect(submitSpy).toHaveBeenCalled(),
                        );
                    },
                },
            },
        },
    });

const TypePlaceAndSelectFirstResultEvent = z
    .object({
        place: z.string(),
    })
    .nonstrict();
type TypePlaceAndSelectFirstResultEvent = z.infer<
    typeof TypePlaceAndSelectFirstResultEvent
>;

const SelectRadiusEvent = z
    .object({
        radius: z.string().optional(),
        index: z.number(),
    })
    .nonstrict();
type SelectRadiusEvent = z.infer<typeof SelectRadiusEvent>;

const SetStartsAtEvent = z
    .object({
        startsAt: z.string(),
    })
    .nonstrict();
type SetStartsAtEvent = z.infer<typeof SetStartsAtEvent>;

const SetEndsAtEvent = z
    .object({
        endsAt: z.string(),
    })
    .nonstrict();
type SetEndsAtEvent = z.infer<typeof SetEndsAtEvent>;

const physicalConstraintsValidationTestModel = createTestModel<TestingContext>(
    physicalConstraintsValidationMachine,
).withEvents({
    TYPE_PLACE_AND_SELECT_FIRST_RESULT: {
        exec: async ({ screen }, event) => {
            const { place } = TypePlaceAndSelectFirstResultEvent.parse(event);

            const placeInput = await screen.findByPlaceholderText(/place/i);
            fireEvent(placeInput, 'focus');
            fireEvent.changeText(placeInput, place);
            const placeSuggestion = await screen.findByText(place);
            fireEvent.press(placeSuggestion);

            await waitFor(() => {
                const placeErrorsGroup =
                    screen.queryByTestId('place-errors-group');
                expect(placeErrorsGroup).toBeNull();
            });
        },

        cases: [
            {
                place: '96 Boulevard Bessières, Paris',
            } as TypePlaceAndSelectFirstResultEvent,
        ],
    },

    SELECT_RADIUS: {
        exec: async ({ screen }, event) => {
            const { radius, index } = SelectRadiusEvent.parse(event);

            const radiusPicker = screen.getByTestId('ios_picker');
            fireEvent(radiusPicker, 'valueChange', radius, index);

            if (radius !== undefined) {
                await waitFor(() => {
                    const radiusErrorsGroup = screen.queryByTestId(
                        'radius-errors-group',
                    );
                    expect(radiusErrorsGroup).toBeNull();
                });
            }
        },

        cases: [
            {
                radius: undefined,
                index: 0,
            } as SelectRadiusEvent,

            {
                radius: '1000',
                index: 0,
            } as SelectRadiusEvent,

            {
                radius: '5000',
                index: 1,
            } as SelectRadiusEvent,

            {
                radius: '10000',
                index: 2,
            } as SelectRadiusEvent,
        ],
    },

    SET_STARTS_AT: {
        exec: async ({ screen }, event) => {
            const { startsAt: startsAtISO } = SetStartsAtEvent.parse(event);
            const startsAt = new Date(startsAtISO);

            const startsAtInput = screen.getByText(/starts.*at/i);
            fireEvent.press(startsAtInput);
            const startsAtDateTimePicker = screen.getByTestId(
                'starts-at-datetime-picker',
            );
            fireEvent(
                startsAtDateTimePicker,
                'change',
                { nativeEvent: { timestamp: startsAt } },
                startsAt,
            );
            const startsAtDateTimePickerConfirmButton =
                screen.getByA11yLabel(/confirm/i);
            fireEvent.press(startsAtDateTimePickerConfirmButton);

            await waitForElementToBeRemoved(() =>
                screen.getByTestId('starts-at-datetime-picker'),
            );
        },

        cases: [
            {
                startsAt: subDays(new Date(), 1).toISOString(),
            } as SetStartsAtEvent,

            {
                startsAt: addHours(new Date(), 1).toISOString(),
            } as SetStartsAtEvent,
        ],
    },

    SET_ENDS_AT: {
        exec: async ({ screen }, event) => {
            const { endsAt: endsAtISO } = SetEndsAtEvent.parse(event);
            const endsAt = new Date(endsAtISO);

            const endsAtInput = screen.getByText(/ends.*at/i);
            fireEvent.press(endsAtInput);
            const endsAtDateTimePicker = screen.getByTestId(
                'ends-at-datetime-picker',
            );
            fireEvent(
                endsAtDateTimePicker,
                'change',
                { nativeEvent: { timestamp: new Date(endsAt) } },
                new Date(endsAt),
            );
            const endsAtDateTimePickerConfirmButton =
                screen.getByA11yLabel(/confirm/i);
            fireEvent.press(endsAtDateTimePickerConfirmButton);

            await waitForElementToBeRemoved(() =>
                screen.getByTestId('ends-at-datetime-picker'),
            );
        },

        cases: [
            {
                endsAt: subDays(new Date(), 4).toISOString(),
            } as SetEndsAtEvent,

            {
                endsAt: addHours(new Date(), 6).toISOString(),
            } as SetEndsAtEvent,

            {
                endsAt: addMinutes(new Date(), 5).toISOString(),
            } as SetEndsAtEvent,
        ],
    },

    SUBMIT: ({ triggerSubmit }) => {
        triggerSubmit();
    },
});

describe('Physical constraints validation', () => {
    const testPlans =
        physicalConstraintsValidationTestModel.getShortestPathPlans({});

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    const submitSpy: jest.Mock<
                        void,
                        [
                            MusicTrackVoteCreationFormPhysicalConstraintsFormFieldValues,
                        ]
                    > = jest.fn();

                    const screen = render(
                        <MusicTrackVoteCreationFormPhysicalConstraintsContent
                            hasPhysicalConstraints
                            physicalConstraintStartsAt={new Date()}
                            physicalConstraintEndsAt={new Date()}
                            handleSetPhysicalConstraintsStatus={() => noop}
                            handleGoBack={noop}
                            handleGoNext={submitSpy}
                        />,
                    );

                    function triggerSubmit() {
                        const submitButton = screen.getByText(/next/i);

                        fireEvent.press(submitButton);
                    }

                    await path.test({
                        triggerSubmit,
                        submitSpy,
                        screen,
                    });
                });
            });
        });
    });

    it('should have full coverage', () => {
        physicalConstraintsValidationTestModel.testCoverage({
            filter: (stateNode) => !!stateNode.meta,
        });
    });
});
