import React, { useState, useCallback } from 'react';
import { Alert, Button, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusicTrackVoteScreenProps } from '../types';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import MusicPlayer from '../components/track-vote/MusicPlayer';

const MusicTrackVoteScreen: React.FC<MusicTrackVoteScreenProps> = ({
    route,
    navigation,
}) => {
    const roomId = route.params.roomId;
    const insets = useSafeAreaInsets();
    const [playing, setPlaying] = useState(false);
    const onStateChange = useCallback((state) => {
        if (state === 'ended') {
            setPlaying(false);
            Alert.alert('Baptiste is using brew on linux!');
        }
    }, []);

    const togglePlaying = useCallback(() => {
        setPlaying((prev) => !prev);
    }, []);

    return (
        <AppScreen>
            <AppScreenHeader
                title={roomId}
                insetTop={insets.top}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer>
                <Text>{roomId}</Text>

                <MusicPlayer videoId="55SwKPVMVM4" videoState="stopped" />

                <Button
                    title={playing ? 'pause' : 'play'}
                    onPress={togglePlaying}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MusicTrackVoteScreen;
