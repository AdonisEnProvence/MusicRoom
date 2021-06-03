import React from 'react';
import YoutubePlayer from 'react-native-youtube-iframe';

type MusicPlayerProps = {
    videoId: string;

    videoState: 'playing' | 'stopped';
};

const MusicPlayer: React.FC<MusicPlayerProps> = ({ videoId, videoState }) => {
    return (
        <YoutubePlayer
            height={300}
            play={videoState === 'playing'}
            videoId={videoId}
        />
    );
};

export default MusicPlayer;
