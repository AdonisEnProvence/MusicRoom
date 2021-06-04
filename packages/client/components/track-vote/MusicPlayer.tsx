import React from 'react';
import { Pressable, View } from 'react-native';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';

export type MusicPlayerRef = YoutubeIframeRef | null;

type MusicPlayerProps = {
    videoId: string;
    videoState: 'playing' | 'stopped';
    playerHeight: number;
    playerRef: React.MutableRefObject<MusicPlayerRef>;
};

function noop() {
    return undefined;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
    videoId,
    videoState,
    playerHeight,
    playerRef,
}) => {
    return (
        <Pressable onPress={noop} onLongPress={noop}>
            <View pointerEvents="none">
                <YoutubePlayer
                    ref={playerRef}
                    height={playerHeight}
                    play={videoState === 'playing'}
                    videoId={videoId}
                />
            </View>
        </Pressable>
    );
};

export default MusicPlayer;
