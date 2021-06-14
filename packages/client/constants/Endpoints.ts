import { Platform } from 'react-native';

type ApplicationEnvironment = 'development' | 'prod';

function computeServerEndpoint(
    env: ApplicationEnvironment,
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

const currentEnvironment: ApplicationEnvironment = (process.env.NODE_ENV ??
    'development') as ApplicationEnvironment;

export const SERVER_ENDPOINT = computeServerEndpoint(
    currentEnvironment,
    Platform.OS,
);
