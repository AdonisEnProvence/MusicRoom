import '@testing-library/jest-native';
import { server } from './tests/server/test-server';

jest.setTimeout(20_000);

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
