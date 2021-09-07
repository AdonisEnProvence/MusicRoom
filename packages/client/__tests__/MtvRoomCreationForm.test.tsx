import React from 'react';
import { createModel as createTestModel } from '@xstate/test';
import { createModel } from 'xstate/lib/model';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from '../navigation';
import { fireEvent, noop, render } from '../tests/tests-utils';
import { ContextFrom } from 'xstate';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';

const createMtvRoomWithSettingsModel = createModel(
    {},
    {
        events: {
            CLICK_GO_TO_MTV_ROOM_CREATION_FORM: () => ({}),
        },
    },
);

const createMtvRoomWithSettingsMachine =
    createMtvRoomWithSettingsModel.createMachine({
        initial: 'home',

        states: {
            home: {
                on: {
                    CLICK_GO_TO_MTV_ROOM_CREATION_FORM: {
                        target: 'roomName',
                    },
                },

                meta: {
                    test: ({ screen }: TestingContext) => {
                        expect(
                            screen.getAllByText(/home/i).length,
                        ).toBeGreaterThanOrEqual(1);
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

                type: 'final',
            },
        },
    });

interface TestingContext {
    screen: ReturnType<typeof render>;
}

const createMtvRoomWithSettingsTestModel = createTestModel<
    TestingContext,
    ContextFrom<typeof createMtvRoomWithSettingsMachine>
>(createMtvRoomWithSettingsMachine, {
    events: {
        CLICK_GO_TO_MTV_ROOM_CREATION_FORM: ({ screen }) => {
            const openMtvRoomCreationFormButton = screen.getByText(
                /open.*mtv.*room.*creation.*form/i,
            );

            fireEvent.press(openMtvRoomCreationFormButton);
        },
    },
});

describe('Create mtv room with custom settings', () => {
    const testPlans = createMtvRoomWithSettingsTestModel.getShortestPathPlans();

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
        return createMtvRoomWithSettingsTestModel.testCoverage();
    });
});
