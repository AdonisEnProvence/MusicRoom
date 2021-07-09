import Slider from '@react-native-community/slider';
import { View } from 'dripsy';
import React from 'react';
import { CurrentTrack } from '../../../types/dist';
import { useFormatSeconds } from '../../hooks/useFormatSeconds';
import { useLayout } from '../../hooks/useLayout';
import { Typo } from '../kit';
import MusicPlayerControlButton from './MusicPlayerControlButton';
import MusicPlayer, { MusicPlayerRef } from './Player';

type TheMusicPlayerWithControlsProps = {
    currentTrack: CurrentTrack;
    isPlaying: boolean;
    onTrackReady: () => void;
    onPlayingToggle: () => void;
    onNextTrackPress: () => void;
    setPlayerRef: (playerRef: MusicPlayerRef) => void;
};

const TheMusicPlayerWithControls: React.FC<TheMusicPlayerWithControlsProps> = ({
    currentTrack,
    isPlaying,
    onTrackReady,
    onPlayingToggle,
    onNextTrackPress,
    setPlayerRef,
}) => {
    const { title, duration, elapsed, id, artistName } = currentTrack;
    const [{ width: containerWidth }, onContainerLayout] = useLayout();
    const playerHeight = (containerWidth * 9) / 16;
    const formattedElapsedTime = useFormatSeconds(elapsed);
    const formattedTotalDuration = useFormatSeconds(duration);

    return (
        <View sx={{ flex: 1 }} onLayout={onContainerLayout}>
            <MusicPlayer
                setPlayerRef={setPlayerRef}
                videoId={id}
                videoState={isPlaying ? 'playing' : 'stopped'}
                playerHeight={playerHeight}
                onTrackReady={onTrackReady}
            />

            <Typo sx={{ marginTop: 'l', fontSize: 'm', fontWeight: '600' }}>
                {title}
            </Typo>
            <Typo sx={{ marginTop: 's', fontSize: 's', color: 'greyLighter' }}>
                {artistName}
            </Typo>

            <View sx={{ marginTop: 'm' }}>
                <Slider
                    disabled
                    value={elapsed}
                    minimumValue={0}
                    maximumValue={duration}
                    minimumTrackTintColor="white"
                />

                <View
                    sx={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    }}
                >
                    <Typo
                        sx={{ fontSize: 'xs', color: 'greyLighter' }}
                        accessibilityLabel={`${formattedElapsedTime} minutes elapsed`}
                    >
                        {formattedElapsedTime}
                    </Typo>

                    <Typo
                        sx={{ fontSize: 'xs', color: 'greyLighter' }}
                        accessibilityLabel={`${formattedElapsedTime} minutes duration`}
                    >
                        {formattedTotalDuration}
                    </Typo>
                </View>
            </View>

            <View
                sx={{
                    marginTop: 'm',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <MusicPlayerControlButton
                    iconName={isPlaying ? 'pause' : 'play'}
                    variant="prominent"
                    adjustIconHorizontally={2}
                    accessibilityLabel={
                        isPlaying ? 'Pause the video' : 'Play the video'
                    }
                    onPress={onPlayingToggle}
                />

                <MusicPlayerControlButton
                    iconName="play-forward"
                    accessibilityLabel="Play next track"
                    onPress={onNextTrackPress}
                />
            </View>
        </View>
    );
};

export default TheMusicPlayerWithControls;
