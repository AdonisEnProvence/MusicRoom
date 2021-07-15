import React from 'react';
import { Pressable, View } from 'react-native';
import YouTubePlayer, { PlayerRef } from '../YouTubePlayer';

export type MusicPlayerRef = PlayerRef | null;

type MusicPlayerProps = {
    videoId: string;
    videoState: 'playing' | 'stopped';
    playerHeight: number;
    setPlayerRef: (playerRef: MusicPlayerRef) => void;
    onTrackReady: () => void;
};

function noop() {
    return undefined;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
    videoId,
    videoState,
    playerHeight,
    setPlayerRef,
    onTrackReady,
}) => {
    return (
        <Pressable onPress={noop} onLongPress={noop}>
            <View pointerEvents="none">
                <YouTubePlayer
                    ref={setPlayerRef}
                    height={playerHeight}
                    playing={videoState === 'playing'}
                    videoId={videoId}
                    onReady={onTrackReady}
                />
            </View>
        </Pressable>
    );
};

export default MusicPlayer;
