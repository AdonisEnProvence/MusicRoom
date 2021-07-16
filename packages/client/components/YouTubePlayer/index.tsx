/* eslint-disable @typescript-eslint/no-var-requires */
import { Platform } from 'react-native';
import { PlayerComponent } from './contract';

const YouTubePlayer: PlayerComponent = Platform.select({
    native: () => require('./native').default,
    default: () => require('./web').default,
})();

export default YouTubePlayer;

export * from './contract';
