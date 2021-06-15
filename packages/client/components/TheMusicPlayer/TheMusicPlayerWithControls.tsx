import Slider from '@react-native-community/slider';
import { View } from 'dripsy';
import React from 'react';
import { useFormatSeconds } from '../../hooks/useFormatSeconds';
import { useLayout } from '../../hooks/useLayout';
import { Typo } from '../kit';
import MusicPlayer, { MusicPlayerRef } from './Player';
import MusicPlayerControlButton from './MusicPlayerControlButton';

type TheMusicPlayerWithControlsProps = {
    videoId: string;
    trackTitle: string;
    trackArtist: string;
    isPlaying: boolean;
    onTrackReady: () => void;
    onPlayingToggle: () => void;
    onNextTrackPress: () => void;
    setPlayerRef: (playerRef: MusicPlayerRef) => void;
    totalDuration: number;
    elapsedTime: number;
};

const TheMusicPlayerWithControls: React.FC<TheMusicPlayerWithControlsProps> = ({
    videoId,
    trackTitle,
    trackArtist,
    isPlaying,
    onTrackReady,
    onPlayingToggle,
    onNextTrackPress,
    setPlayerRef,
    totalDuration,
    elapsedTime,
}) => {
    const [{ width: containerWidth }, onContainerLayout] = useLayout();
    const playerHeight = (containerWidth * 9) / 16;
    const formattedElapsedTime = useFormatSeconds(elapsedTime);
    const formattedTotalDuration = useFormatSeconds(totalDuration);

    return (
        <View sx={{ flex: 1 }} onLayout={onContainerLayout}>
            <MusicPlayer
                setPlayerRef={setPlayerRef}
                videoId={videoId}
                videoState={isPlaying ? 'playing' : 'stopped'}
                playerHeight={playerHeight}
                onTrackReady={onTrackReady}
            />

            <Typo sx={{ marginTop: 'l', fontSize: 'm', fontWeight: '600' }}>
                {trackTitle}
            </Typo>
            <Typo sx={{ marginTop: 's', fontSize: 's', color: 'greyLighter' }}>
                {trackArtist}
            </Typo>

            <View sx={{ marginTop: 'm' }}>
                <Slider
                    disabled
                    value={elapsedTime}
                    minimumValue={0}
                    maximumValue={totalDuration}
                    minimumTrackTintColor="white"
                />

                <View
                    sx={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    }}
                >
                    <Typo sx={{ fontSize: 'xs', color: 'greyLighter' }}>
                        {formattedElapsedTime}
                    </Typo>

                    <Typo sx={{ fontSize: 'xs', color: 'greyLighter' }}>
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
                    onPress={onPlayingToggle}
                />

                <MusicPlayerControlButton
                    iconName="play-forward"
                    onPress={onNextTrackPress}
                />
            </View>
        </View>
    );
};

export default TheMusicPlayerWithControls;
