import { StackScreenProps } from '@react-navigation/stack';
import React, { useState, useCallback } from 'react';
import { View, Alert, Button } from 'react-native';
// import YoutubePlayer from 'react-native-youtube-iframe';
import { RootStackParamList } from '../types';

const TrackPlayer: React.FC<
    StackScreenProps<RootStackParamList, 'TrackPlayer'>
> = ({ route }) => {
    const [playing, setPlaying] = useState(false);
    const videoID = route.params.track.id;
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
        <View>
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
