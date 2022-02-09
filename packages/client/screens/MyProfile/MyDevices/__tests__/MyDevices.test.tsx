import { assign, EventFrom, StateFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { createModel as createTestModel } from '@xstate/test';
import { UserDevice } from '@musicroom/types';
import invariant from 'tiny-invariant';
import {
    renderApp,
    fireEvent,
    waitFor,
    testGetFakeUserID,
    render,
} from '../../../../tests/tests-utils';
import { db, generateArray, generateUserDevice } from '../../../../tests/data';
import { assertEventType } from '../../../../machines/utils';
import { serverSocket } from '../../../../services/websockets';

const CURRENT_USER_DEVICE = generateUserDevice();

const INITIAL_USER_DEVICES: UserDevice[] = [
    CURRENT_USER_DEVICE,
    ...generateArray({
        minLength: 3,
        maxLength: 4,
        fill: () => generateUserDevice(),
    }),
];

const RELOADED_USER_DEVICES: UserDevice[] = [
    CURRENT_USER_DEVICE,
    ...generateArray({
        minLength: 1,
        maxLength: 2,
        fill: () => generateUserDevice(),
    }),
];

interface TestingContext {
    screen: ReturnType<typeof render> | undefined;
}

const myDevicesModel = createModel(
    {
        devicesList: [] as UserDevice[],
    },
    {
        events: {
            'Reload devices list': (args: { devices: UserDevice[] }) => args,

            'Set up devices list and render the application': (args: {
                devices: UserDevice[];
            }) => args,
        },
    },
);

type MyDevicesMachineState = StateFrom<typeof myDevicesMachine>;

const myDevicesMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QFkCeACAImAbgSwGM4A6ASQDs8AXPAQwBs8AvMdKgC1doAdvGDaNAPbkAxAGUwVdAFdu6CLkJx0jWNNrkI6AE5gtYHW07oefQoLwjEobkNjUr5GyAAeiAJwAmYgDYALB4eAMz+AIwREQAcHgDsADQgqIhhscF+qR7+Xr4ArLlecVGxAL4liWhYSkSwxJh4sHy0qHjkUArVKmpUogBKYPRCtNqK+DWqDVQudg7CzkhuiLFh-sSpsRvBAAy5HrlhwV6JyQj+y8Sx2QWp2Vt3vmXlIORCivALldhjJBSODMysDhcXj8SzWBYzRzg0DuBAAWhWPgCXmiOwKwUuvmOiF2xA8vi8sV8GKih0u-ly-jKFQwX2UtXqjXozVa7VG9Im6mm9ih8xhiGC+OI20C-i2HjuXjF-mxCGCeWIUQpuXupK8lKpT0+nVqAFEdDohHptAAzKQEdisjrfWCcqYQnlzFywoJbYgoiWI5YUsKy7YeYgU4IFKJbHLBYM7akgbU27mzJzOxAI3y+PzZVH5LwY-xYpLJg7EMNRFbBJUh1JhKKPEpAA */
    myDevicesModel.createMachine(
        {
            id: 'My Devices',
            initial: 'Initialize the application',
            states: {
                'Initialize the application': {
                    meta: {
                        test: ({ screen }: TestingContext) => {
                            expect(screen).toBeUndefined();
                        },
                    },
                    on: {
                        'Set up devices list and render the application': {
                            actions: 'assign devices list to context',
                            target: '#My Devices.Displaying devices list',
                        },
                    },
                },
                'Displaying devices list': {
                    meta: {
                        test: async (
                            { screen }: TestingContext,
                            { context: { devicesList } }: MyDevicesMachineState,
                        ) => {
                            invariant(
                                screen !== undefined,
                                'The application must have been rendered before transitioning to this state',
                            );

                            for (const device of devicesList) {
                                await waitFor(() => {
                                    expect(
                                        screen.getByText(device.name),
                                    ).toBeTruthy();
                                });
                            }
                        },
                    },
                    on: {
                        'Reload devices list': [
                            {
                                actions: 'assign devices list to context',
                                cond: 'Devices list is empty',
                                target: '#My Devices.Devices list is empty',
                            },
                            {
                                actions: 'assign devices list to context',
                                target: '#My Devices.Displaying devices list',
                            },
                        ],
                    },
                },
                'Devices list is empty': {
                    type: 'final',
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            invariant(
                                screen !== undefined,
                                'The application must have been rendered before transitioning to this state',
                            );

                            await waitFor(() => {
                                expect(
                                    screen.getByText(/couldn't.*find.*device/i),
                                ).toBeTruthy();
                            });
                        },
                    },
                },
            },
        },
        {
            guards: {
                'Devices list is empty': (_context, event) => {
                    assertEventType(event, 'Reload devices list');

                    const devicesListIsEmpty = event.devices.length === 0;

                    return devicesListIsEmpty === true;
                },
            },

            actions: {
                'assign devices list to context': assign({
                    devicesList: (_context, event) => {
                        assertEventType(event, [
                            'Set up devices list and render the application',
                            'Reload devices list',
                        ]);

                        return event.devices;
                    },
                }),
            },
        },
    );

const myDevicesTestModel = createTestModel<TestingContext>(
    myDevicesMachine,
).withEvents({
    'Set up devices list and render the application': {
        exec: async (context, e) => {
            const event = e as EventFrom<
                typeof myDevicesModel,
                'Set up devices list and render the application'
            >;

            serverSocket.on('GET_CONNECTED_DEVICES_AND_DEVICE_ID', (cb) => {
                cb({
                    currDeviceID: CURRENT_USER_DEVICE.deviceID,
                    devices: event.devices,
                });
            });

            const screen = await renderApp();

            expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(
                1,
            );

            const myProfileButton = screen.getByTestId(
                'open-my-profile-page-button',
            );
            expect(myProfileButton).toBeTruthy();

            fireEvent.press(myProfileButton);

            await waitFor(() => {
                expect(
                    screen.getByTestId('my-profile-page-container'),
                ).toBeTruthy();
            });

            const goToDevicesListButton = screen.getByText(/devices/i);
            expect(goToDevicesListButton).toBeTruthy();

            fireEvent.press(goToDevicesListButton);

            await waitFor(() => {
                const myDevicesScreenTitle = screen.getByText(/my.*devices/i);
                expect(myDevicesScreenTitle).toBeTruthy();
            });

            context.screen = screen;
        },

        cases: [
            {
                devices: INITIAL_USER_DEVICES,
            },
        ] as Omit<
            EventFrom<
                typeof myDevicesModel,
                'Set up devices list and render the application'
            >,
            'type'
        >[],
    },

    'Reload devices list': {
        exec: (_context, e) => {
            const event = e as EventFrom<
                typeof myDevicesModel,
                'Reload devices list'
            >;

            serverSocket.emit('CONNECTED_DEVICES_UPDATE', event.devices);
        },

        cases: [
            {
                devices: RELOADED_USER_DEVICES,
            },
            {
                devices: [],
            },
        ] as Omit<
            EventFrom<
                typeof myDevicesModel,
                'Set up devices list and render the application'
            >,
            'type'
        >[],
    },
});

describe('My Devices', () => {
    const testPlans = myDevicesTestModel.getSimplePathPlans();

    testPlans.forEach((plan) => {
        describe(plan.description, () => {
            plan.paths.forEach((path) => {
                it(path.description, async () => {
                    const userID = testGetFakeUserID();

                    db.myProfileInformation.create({
                        userID,
                    });

                    await path.test({
                        screen: undefined,
                    });
                });
            });
        });
    });

    it('should have full coverage', () => {
        myDevicesTestModel.testCoverage();
    });
});
