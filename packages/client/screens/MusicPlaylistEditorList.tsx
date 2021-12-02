import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'dripsy';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { MpeTabMpeRoomsScreenProps } from '../types';

const MusicPlaylistEditorListScreen: React.FC<MpeTabMpeRoomsScreenProps> =
    () => {
        const insets = useSafeAreaInsets();

        return (
            <AppScreen>
                <AppScreenHeader title="Library" insetTop={insets.top} />

                <AppScreenContainer>
                    <Text sx={{ color: 'white' }}>MPE list</Text>
                </AppScreenContainer>
            </AppScreen>
        );
    };

export default MusicPlaylistEditorListScreen;
