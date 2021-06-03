import React, { useState, useCallback } from 'react';
import { View, Alert, Button, Text } from 'react-native';
import { MusicTrackVoteScreenProps } from '../types';
import MusicPlayer from '../components/track-vote/MusicPlayer';

const TrackPlayer: React.FC<MusicTrackVoteScreenProps> = ({ route }) => {
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
        <View style={{ paddingVertical: 60, paddingHorizontal: 20 }}>
            <Text>{roomId}</Text>

            <MusicPlayer videoId="55SwKPVMVM4" videoState="playing" />

            <Button
                title={playing ? 'pause' : 'play'}
                onPress={togglePlaying}
            />
        </View>
    );
};

export default TrackPlayer;
