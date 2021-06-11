import { Platform } from 'react-native';

function computeServerEndpoint(
    env: 'development' | 'prod',
    os: 'ios' | 'android' | 'windows' | 'macos' | 'web',
): string {
    if (env !== 'development') {
        return 'http://localhost:3333'; //TODO TO BE DEFINED LATER
    }

    switch (os) {
        case 'ios':
            return 'http://127.0.0.1:3333';
        case 'android':
            return 'http://10.0.2.2:3333';
        case 'web':
            return 'http://localhost:3333';
        default:
            throw new Error('os not supported');
    }
}

export const SERVER_ENDPOINT = computeServerEndpoint(
    process.env.NODE_ENV ?? 'development',
    Platform.OS,
);
