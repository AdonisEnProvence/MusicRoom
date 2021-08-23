import React from 'react';
import { Pressable, View } from 'react-native';
import YouTubePlayer, { PlayerRef } from '../YouTubePlayer';

export type MusicPlayerRef = PlayerRef | null;

type MusicPlayerProps = {
    videoId: string;
    videoState: 'playing' | 'stopped';
    playerHeight: number;
    seekToInSeconds: number;
    mute: boolean;
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
    seekToInSeconds,
    mute,
}) => {
    return (
        <Pressable onPress={noop} onLongPress={noop}>
            <View pointerEvents="none">
                <YouTubePlayer
                    seekToInSeconds={seekToInSeconds}
                    ref={setPlayerRef}
                    height={playerHeight}
                    playing={videoState === 'playing'}
                    videoId={videoId}
                    onReady={onTrackReady}
                    mute={mute}
                />
            </View>
        </Pressable>
    );
};

export default MusicPlayer;
