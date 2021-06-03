import React, { useState, useCallback } from 'react';
import { View, Alert, Button, Text } from 'react-native';
// import YoutubePlayer from 'react-native-youtube-iframe';
import { MusicTrackVoteScreenProps } from '../types';

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

            {/* <YoutubePlayer
                height={300}
                play={playing}
                videoId={videoID}
                onChangeState={onStateChange}
            /> */}
            <Button
                title={playing ? 'pause' : 'play'}
                onPress={togglePlaying}
            />
        </View>
    );
};

export default TrackPlayer;
