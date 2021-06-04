import React, { useState, useCallback } from 'react';
import { Alert, Button, Text } from 'react-native';
import { MusicTrackVoteScreenProps } from '../types';
import { AppScreen } from '../components/kit';
import MusicPlayer from '../components/track-vote/MusicPlayer';

const TrackPlayer: React.FC<MusicTrackVoteScreenProps> = ({
    route,
    navigation,
}) => {
    const roomId = route.params.roomId;

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
        <AppScreen
            canGoBack={true}
            goBack={() => {
                navigation.goBack();
            }}
        >
            <Text>{roomId}</Text>

            <MusicPlayer videoId="55SwKPVMVM4" videoState="stopped" />

            <Button
                title={playing ? 'pause' : 'play'}
                onPress={togglePlaying}
            />
        </AppScreen>
    );
};

export default TrackPlayer;
