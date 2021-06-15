module.exports = {
    preset: 'jest-expo',
    transformIgnorePatterns: [
        'node_modules/(?!(jest-)?react-native|react-clone-referenced-element|dripsy|@dripsy/.*|@react-native-community|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|@sentry/.*)',
    ],
    testPathIgnorePatterns: ['/node_modules/', 'dist'],
    setupFilesAfterEnv: [
        './jest.setup.tsx',
        './tests/global-mocks.ts',
        '@testing-library/jest-native/extend-expect',
    ],
};
