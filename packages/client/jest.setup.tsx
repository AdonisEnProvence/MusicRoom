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
import { cleanup } from './services/websockets';
import { dropDatabase } from './tests/data';
import { server } from './tests/server/test-server';
jest.setTimeout(20_000);

jest.mock('react-native-youtube-iframe', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const React = require('react');
    const { useState, useImperativeHandle, useEffect } = React;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');

    function randomIntFromInterval(min: number, max: number) {
        // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

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

            // Call onReady props directly when the component is mounted
            useEffect(() => {
                props.onReady?.();
            });

            return <View {...props} />;
        },
    ) as unknown;
});

jest.mock('react-native-reanimated', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Reanimated = require('react-native-reanimated/mock');

    // Reanimated.default.call = () => {
    //     return undefined;
    // };

    // Reanimated.useSharedValue.call = () => {
    //     return undefined;
    // };

    return {
        ...Reanimated,
        userSharedValue: jest.fn(),
    };
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
    const { View } = require('react-native');

    return {
        BottomSheetModalProvider: View,
        BottomSheetHandle: View,

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

jest.mock('react-native-toast-message', () => ({
    show: jest.fn(),
    hide: jest.fn(),
}));

//Location mock//
jest.mock('expo-location', () => ({
    getCurrentPositionAsync: jest.fn(),
    requestForegroundPermissionsAsync: jest.fn(() => {
        return {
            status: 'notGranted',
        };
    }),
}));
export const requestForegroundPermissionsAsyncMocked =
    requestForegroundPermissionsAsync as jest.MockedFunction<
        typeof requestForegroundPermissionsAsync
    >;
export const getCurrentPositionAsyncMocked =
    getCurrentPositionAsync as jest.MockedFunction<
        typeof getCurrentPositionAsync
    >;

// Set up MSW before all tests, close MSW after all tests and clear temporary listeners after each test.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
});

beforeEach(() => {
    cleanup();
    dropDatabase();
});

// jest.spyOn(console, 'warn').mockImplementation(() => {});
// jest.spyOn(console, 'error').mockImplementation(() => {});
