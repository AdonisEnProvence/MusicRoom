/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Platform } from 'react-native';
import React from 'react';

type MusicPlayer = React.FC;

const CustomImport = Platform.select<() => { default: MusicPlayer }>({
    android: () => require('./native'),
    ios: () => require('./native'),
    web: () => require('./web'),
});
if (CustomImport === undefined) {
    throw new Error(
        `The platform ${Platform.OS} is not supported by MusicPlayer component`,
    );
}
const { default: Player } = CustomImport();

export default Player;
