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
    const playing = videoState === 'playing';
    const playingTestIDSection = playing ? 'playing' : 'not-playing';
    const muteTestIDSection = mute ? 'muted' : 'emitting';
    const testID = `music-player-${playingTestIDSection}-device-${muteTestIDSection}`;

    return (
        <Pressable onPress={noop} onLongPress={noop}>
            <View pointerEvents="none" testID={testID}>
                <YouTubePlayer
                    seekToInSeconds={seekToInSeconds}
                    ref={setPlayerRef}
                    height={playerHeight}
                    playing={playing}
                    videoId={videoId}
                    onReady={onTrackReady}
                    mute={mute}
                />
            </View>
        </Pressable>
    );
};

export default MusicPlayer;
