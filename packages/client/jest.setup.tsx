import type {
    BottomSheetModal,
    BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import '@testing-library/jest-native';
import {
    getCurrentPositionAsync,
    requestForegroundPermissionsAsync,
} from 'expo-location';
import React from 'react';
import {
    YoutubeIframeProps,
    YoutubeIframeRef,
} from 'react-native-youtube-iframe';
import faker from 'faker';
import { cleanup, serverSocket } from './services/websockets';
import { dropDatabase } from './tests/data';
import { server } from './tests/server/test-server';

jest.setTimeout(20_000);

faker.seed(42);

jest.mock('react-native-maps', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Component } = require('react');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');

    class MockMapView extends Component {
        render() {
            const { testID, children, ...props } = this.props;

            return (
                <View testID={testID} {...props}>
                    {children}
                </View>
            );
        }
    }

    class MockMarker extends Component {
        render() {
            const { testID, children, ...props } = this.props;

            return (
                <View testID={testID} {...props}>
                    {children}
                </View>
            );
        }
    }

    class MockCircle extends Component {
        render() {
            const { testID, children, ...props } = this.props;

            return (
                <View testID={testID} {...props}>
                    {children}
                </View>
            );
        }
    }

    const mockMapTypes = {
        STANDARD: 0,
        SATELLITE: 1,
        HYBRID: 2,
        TERRAIN: 3,
        NONE: 4,
        MUTEDSTANDARD: 5,
    };

    return {
        __esModule: true,
        default: MockMapView,
        Marker: MockMarker,
        Circle: MockCircle,
        MAP_TYPES: mockMapTypes,
        PROVIDER_DEFAULT: 'default',
        PROVIDER_GOOGLE: 'google',
    };
});

jest.mock('react-native-youtube-iframe', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createMachine, assign } = require('xstate');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useMachine } = require('@xstate/react');
    const { useState, useImperativeHandle, useEffect } = React;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');

    function randomIntFromInterval(min: number, max: number) {
        // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    /**
     * PlayerMachine has the following behaviour, when coupled to a
     * `useEffect` that only send a message when videoId changes:
     *
     * - Always debounce calls to `callOnReady` action, by 10 milliseconds.
     * - Keep reference to `onReady` via `callOnReady` up to date. (Done automatically by @xstate/react)
     *   It can change between renders, we want to always call the newest one.
     * - Call `callOnReady` action each time a new `videoId` is set.
     */
    const playerMachine = createMachine({
        initial: 'idle',

        states: {
            idle: {},

            waiting: {
                after: {
                    10: {
                        target: 'idle',

                        actions: 'callOnReady',
                    },
                },
            },
        },

        on: {
            VIDEO_ID_CHANGED: {
                target: 'waiting',
            },
        },
    });

    return React.forwardRef(
        (props: YoutubeIframeProps, ref: YoutubeIframeRef) => {
            const [createdAt] = useState(new Date());
            const [durationSeconds] = useState(randomIntFromInterval(200, 360));
            const [alreadyElapsed, setAlreadyElapsed] = useState(0);

            useImperativeHandle(ref, () => ({
                getDuration: () => Promise.resolve(durationSeconds),
                seekTo: (seconds: number, allowSeekAhead: boolean) => {
                    setAlreadyElapsed(seconds);
                },
                getCurrentTime: () => {
                    const currentDate = new Date();
                    const millisecondsDiff =
                        Number(currentDate) - Number(createdAt);
                    const elapsedSeconds =
                        millisecondsDiff / 1000 + (alreadyElapsed as number);

                    return Promise.resolve(
                        Math.min(elapsedSeconds, durationSeconds),
                    );
                },
            }));

            const { onReady, videoId } = props;

            // `callOnReady` action will always use the most recent version of `onReady`
            // as described here: https://xstate.js.org/docs/recipes/react.html#other-hooks.
            const [, send] = useMachine(playerMachine, {
                actions: {
                    callOnReady: onReady,
                },
            });

            // The effect will be called on the first render and each time
            // videoId prop changes.
            useEffect(() => {
                send({
                    type: 'VIDEO_ID_CHANGED',
                });
            }, [videoId, send]);

            return <View {...props} />;
        },
    ) as unknown;
});

jest.mock('react-native-reanimated', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Reanimated = require('react-native-reanimated/mock');

    Reanimated.default.call = () => {
        return undefined;
    };

    return Reanimated as unknown;
});

jest.mock('moti', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');

    return {
        View,
    };
});

jest.mock('@motify/skeleton', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');

    return {
        Skeleton: View,
    };
});

jest.mock('@gorhom/bottom-sheet', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { forwardRef, useImperativeHandle, useState } = require('react');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View, FlatList } = require('react-native');

    return {
        BottomSheetModalProvider: View,
        BottomSheetHandle: View,
        BottomSheetFlatList: FlatList,
        BottomSheetModal: forwardRef(
            (
                { children }: BottomSheetModalProps,
                ref: React.RefObject<BottomSheetModal>,
            ) => {
                const [isOpen, setIsOpen] = useState(false);

                useImperativeHandle(ref, () => ({
                    present: () => {
                        setIsOpen(true);
                    },
                    close: () => {
                        setIsOpen(false);
                    },
                }));

                return <View>{isOpen ? children : null}</View>;
            },
        ),
    };
});

// Replace websockets service with its mock version.
// In the mock version, we provide an implementation for serverSocket, which permits
// to simulate bidirectional communication.
jest.mock('./services/websockets.ts');

// Necessary to prevent errors from expo-linking
jest.mock('./navigation/LinkingConfiguration.ts', () => {
    return {};
});

// Silence the warning: Animated: `useNativeDriver` is not supported because the native animated module is missing
jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');

jest.mock('react-native-screens', () => ({
    ...jest.requireActual('react-native-screens'),
    enableScreens: jest.fn(),
}));

jest.mock('react-native-toast-message', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');

    const Toast = React.forwardRef((props: unknown, _ref: unknown) => {
        return <View {...props} />;
    });

    function noop() {
        return undefined;
    }

    Toast.setRef = noop;
    Toast.show = jest.fn();
    Toast.hide = jest.fn();

    return {
        __esModule: true,
        default: Toast,
    };
});

//Location mock//
jest.mock('expo-location', () => {
    const originalModule = jest.requireActual('expo-location');

    return {
        ...originalModule,

        getCurrentPositionAsync: jest.fn(),
        requestForegroundPermissionsAsync: jest.fn(() => {
            return {
                status: 'denied',
            };
        }),
    };
});
export const requestForegroundPermissionsAsyncMocked =
    requestForegroundPermissionsAsync as jest.MockedFunction<
        typeof requestForegroundPermissionsAsync
    >;
export const getCurrentPositionAsyncMocked =
    getCurrentPositionAsync as jest.MockedFunction<
        typeof getCurrentPositionAsync
    >;

jest.mock('react-native-svg', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');

    return {
        SvgUri: View,
    };
});

// Set up MSW before all tests, close MSW after all tests and clear temporary listeners after each test.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();

    jest.clearAllMocks();
});

beforeEach(() => {
    cleanup();
    dropDatabase();
    serverSocket.on('GET_HAS_ACKNOWLEDGED_CONNECTION', (onAcknowledged) => {
        onAcknowledged();
    });
});

// jest.spyOn(console, 'warn').mockImplementation();
// jest.spyOn(console, 'error').mockImplementation();
