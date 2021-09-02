import { Text } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { MusicTrackVoteCreationFormNameScreenProps } from '../types';

const MusicTrackVoteCreationFormName: React.FC<MusicTrackVoteCreationFormNameScreenProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();
        const musicPlayerMachine = useMusicPlayer();

        return (
            <AppScreen>
                <AppScreenHeader title="Home" insetTop={insets.top} />

                <AppScreenContainer>
                    <Text>What is the name of the room?</Text>
                </AppScreenContainer>
            </AppScreen>
        );
    };

export default MusicTrackVoteCreationFormName;
