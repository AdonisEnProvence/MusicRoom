import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'dripsy';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../../components/kit';
import { MpeTabMpeSearchTracksScreenProps } from '../../types';

const MusicPlaylistEditorSearchTracksScreen: React.FC<MpeTabMpeSearchTracksScreenProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();

        return (
            <AppScreen>
                <AppScreenHeader title="Search tracks" insetTop={insets.top} />

                <AppScreenContainer />
            </AppScreen>
        );
    };

export default MusicPlaylistEditorSearchTracksScreen;
