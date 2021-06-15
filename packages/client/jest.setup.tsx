import '@testing-library/jest-native';
import React from 'react';
import { cleanup } from './services/__mocks__/websockets';
import { server } from './tests/server/test-server';
import {
    YoutubeIframeProps,
    YoutubeIframeRef,
} from 'react-native-youtube-iframe';

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
            const [duration] = useState(randomIntFromInterval(0, 360));

            useImperativeHandle(ref, () => ({
                getDuration: () => Promise.resolve(duration),
                getCurrentTime: () => {
                    const currentDate = new Date();
                    const millisecondsDiff =
                        Number(currentDate) - Number(createdAt);
                    const secondsDiff = millisecondsDiff / 1000;

                    return Promise.resolve(Math.min(secondsDiff, duration));
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

// Set up MSW before all tests, close MSW after all tests and clear temporary listeners after each test.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

afterEach(() => cleanup());
