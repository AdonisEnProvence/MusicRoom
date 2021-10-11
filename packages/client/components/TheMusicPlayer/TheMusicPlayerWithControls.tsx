import { CurrentTrack } from '@musicroom/types';
import Slider from '@react-native-community/slider';
import { View } from 'dripsy';
import React from 'react';
import { useFormatMilliSeconds } from '../../hooks/useFormatMilliSeconds';
import { useLayout } from '../../hooks/useLayout';
import { Typo } from '../kit';
import MusicPlayerControlButton from './MusicPlayerControlButton';
import MusicPlayer, { MusicPlayerRef } from './Player';

type TheMusicPlayerWithControlsProps = {
    progressElapsedTime: number;
    currentTrack: CurrentTrack | null;
    isDeviceEmitting: boolean;
    isPlaying: boolean;
    roomIsReady: boolean;
    hideControlButtons: boolean;
    onTrackReady: () => void;
    onPlayingToggle: () => void;
    onNextTrackPress: () => void;
    setPlayerRef: (playerRef: MusicPlayerRef) => void;
};

const TheMusicPlayerWithControls: React.FC<TheMusicPlayerWithControlsProps> = ({
    currentTrack,
    isPlaying,
    isDeviceEmitting,
    progressElapsedTime,
    roomIsReady,
    hideControlButtons,
    onTrackReady,
    onPlayingToggle,
    onNextTrackPress,
    setPlayerRef,
}) => {
    const [{ width: containerWidth }, onContainerLayout] = useLayout();
    const playerHeight = (containerWidth * 9) / 16;
    const formattedElapsedTime = useFormatMilliSeconds(
        progressElapsedTime || 0,
    );
    const formattedTotalDuration = useFormatMilliSeconds(
        currentTrack?.duration || 0,
    );
    const controlDisabled = !roomIsReady;
    const muteDevice = isDeviceEmitting === false;

    const showControlButtons = !hideControlButtons;
    return (
        <View onLayout={onContainerLayout}>
            {currentTrack && (
                <>
                    <MusicPlayer
                        mute={muteDevice}
                        seekToInSeconds={currentTrack.elapsed / 1000}
                        setPlayerRef={setPlayerRef}
                        videoId={currentTrack.id}
                        videoState={isPlaying ? 'playing' : 'stopped'}
                        playerHeight={playerHeight}
                        onTrackReady={onTrackReady}
                    />
                    <Typo
                        sx={{
                            marginTop: 'l',
                            fontSize: 'm',
                            fontWeight: '600',
                        }}
                    >
                        {currentTrack.title}
                    </Typo>
                    <Typo
                        sx={{
                            marginTop: 's',
                            fontSize: 's',
                            color: 'greyLighter',
                        }}
                    >
                        {currentTrack.artistName}
                    </Typo>
                    <View sx={{ marginTop: 'm' }}>
                        <Slider
                            disabled
                            value={progressElapsedTime}
                            minimumValue={0}
                            maximumValue={currentTrack.duration}
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
                                accessibilityLabel={`${formattedTotalDuration} minutes duration`}
                            >
                                {formattedTotalDuration}
                            </Typo>
                        </View>
                    </View>
                </>
            )}

            {showControlButtons && (
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
                        disabled={controlDisabled}
                        accessibilityLabel={
                            isPlaying ? 'Pause the video' : 'Play the video'
                        }
                        onPress={onPlayingToggle}
                    />

                    <MusicPlayerControlButton
                        disabled={controlDisabled}
                        iconName="play-forward"
                        accessibilityLabel={`Play next track`}
                        onPress={onNextTrackPress}
                    />
                </View>
            )}
        </View>
    );
};

export default TheMusicPlayerWithControls;
