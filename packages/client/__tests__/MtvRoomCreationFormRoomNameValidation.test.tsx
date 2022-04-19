import React from 'react';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import * as z from 'zod';
import { fireEvent, noop, render, waitFor } from '../tests/tests-utils';
import {
    MusicTrackVoteCreationFormNameContent,
    MusicTrackVoteCreationFormNameFormFieldValues,
} from '../screens/MusicTrackVoteCreationFormName';

interface TestingContext {
    triggerSubmit: () => void;
    submitSpy: jest.Mock<void, [MusicTrackVoteCreationFormNameFormFieldValues]>;

    screen: ReturnType<typeof render>;
}

const roomNameValidationModel = createModel(
    {},
    {
        events: {
            TYPE_ROOM_NAME_AND_SUBMIT: (roomName: string) => ({ roomName }),

            SUBMIT: () => ({}),
        },
    },
);

const roomNameValidationMachine = roomNameValidationModel.createMachine({
    id: 'roomNameValidation',

    initial: 'idle',

    states: {
        idle: {
            meta: {
                test: ({ screen }: TestingContext) => {
                    const roomNameInput =
                        screen.getByPlaceholderText(/Room.*name/i);
                    expect(roomNameInput).toBeTruthy();
                },
            },

            on: {
                SUBMIT: {
                    target: 'inputErrors.fieldRequired',
                },

                TYPE_ROOM_NAME_AND_SUBMIT: [
                    {
                        cond: (_, { roomName }) => {
                            const isEmpty = roomName === '';

                            return isEmpty;
                        },

                        target: 'inputErrors.fieldRequired',
                    },

                    {
                        target: 'success',
                    },
                ],
            },
        },

        inputErrors: {
            initial: 'fieldRequired',

            states: {
                fieldRequired: {
                    meta: {
                        test: async ({ screen, submitSpy }: TestingContext) => {
                            const requiredError = await screen.findByRole(
                                'alert',
                            );
                            expect(requiredError).toBeTruthy();
                            expect(requiredError).toHaveTextContent(
                                /room.*name.*must.*be.*set/i,
                            );

                            expect(submitSpy).not.toHaveBeenCalled();
                        },
                    },
                },
            },
        },

        success: {
            type: 'final',

            meta: {
                test: async ({ screen, submitSpy }: TestingContext) => {
                    await waitFor(() =>
                        expect(screen.queryAllByRole('alert')).toHaveLength(0),
                    );

                    expect(submitSpy).toHaveBeenCalled();
                },
            },
        },
    },
});

const TypeRoomNameAndSubmitEvent = z
    .object({
        roomName: z.string(),
    })
    .nonstrict();
type TypeRoomNameAndSubmitEvent = z.infer<typeof TypeRoomNameAndSubmitEvent>;

const roomNameValidationTestModel = createTestModel<TestingContext>(
    roomNameValidationMachine,
).withEvents({
    TYPE_ROOM_NAME_AND_SUBMIT: {
        exec: ({ screen, triggerSubmit }, event) => {
            const { roomName } = TypeRoomNameAndSubmitEvent.parse(event);

            const roomNameInput = screen.getByPlaceholderText(/Room.*name/i);

            fireEvent.changeText(roomNameInput, roomName);

            triggerSubmit();
        },

        cases: [
            {
                roomName: '',
            } as TypeRoomNameAndSubmitEvent,

            {
                roomName: 'Biolay Fans',
            } as TypeRoomNameAndSubmitEvent,
        ],
    },

    SUBMIT: ({ triggerSubmit }) => {
        triggerSubmit();
    },
});

describe('Room name validation', () => {
    const testPlans = roomNameValidationTestModel.getSimplePathPlans({});

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    const submitSpy: jest.Mock<
                        void,
                        [MusicTrackVoteCreationFormNameFormFieldValues]
                    > = jest.fn();

                    const screen = render(
                        <MusicTrackVoteCreationFormNameContent
                            handleGoBack={noop}
                            handleGoNext={submitSpy}
                            defaultRoomName=""
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
        roomNameValidationTestModel.testCoverage({
            filter: (stateNode) => !!stateNode.meta,
        });
    });
});
