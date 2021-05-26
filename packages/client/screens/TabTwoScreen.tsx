import React, { useCallback, useState } from 'react';
import { Button, Alert } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { View } from '../components/Themed';

const TabTwoScreen: React.FC = () => {
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
        <View>
            <YoutubePlayer
                height={300}
                play={playing}
                videoId={'oavMtUWDBTM'}
                onChangeState={onStateChange}
            />
            <Button
                title={playing ? 'pause' : 'play'}
                onPress={togglePlaying}
            />
        </View>
    );
};

export default TabTwoScreen;
