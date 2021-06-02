import { Platform } from 'react-native';

export const SERVER_ENDPOINT = ((
    env: 'development' | 'prod',
    os: 'ios' | 'android' | 'windows' | 'macos' | 'web',
) => {
    if (env === 'development') {
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
    } else {
        return 'http://localhost:3333'; //TODO TO BE DEFINED LATER
    }
})(process.env.NODE_ENV ?? 'development', Platform.OS);
