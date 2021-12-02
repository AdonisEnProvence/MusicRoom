import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'dripsy';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { MpeTabMpeRoomScreenProps } from '../types';

const MusicPlaylistEditorRoomScreen: React.FC<MpeTabMpeRoomScreenProps> = ({
    navigation,
    route,
}) => {
    const insets = useSafeAreaInsets();
    const playlistID = route.params.id;

    return (
        <AppScreen>
            <AppScreenHeader
                title={`Playlist ${playlistID}`}
                insetTop={insets.top}
            />

            <AppScreenContainer>
                <Text sx={{ color: 'white' }}>Playlist ID: {playlistID}</Text>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MusicPlaylistEditorRoomScreen;
