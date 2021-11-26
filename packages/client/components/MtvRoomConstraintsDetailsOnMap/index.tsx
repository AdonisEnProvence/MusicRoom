/* eslint-disable @typescript-eslint/no-var-requires */
import { Platform } from 'react-native';
import { MapsComponent } from './contract';

const PositionConstraintsDetailsOnMap: MapsComponent = Platform.select({
    native: () => require('./native').default,
    default: () => require('./web').default,
})();

export default PositionConstraintsDetailsOnMap;

export * from './contract';
