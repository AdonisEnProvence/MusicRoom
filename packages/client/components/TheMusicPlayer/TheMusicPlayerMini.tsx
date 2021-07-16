import { View } from 'dripsy';
import React from 'react';
import { Sender } from 'xstate';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
} from '../../machines/appMusicPlayerMachine';
import { Typo } from '../kit';
import MusicPlayerControlButton from './MusicPlayerControlButton';

type TheMusicPlayerMiniProps = {
    height: number;
    machineState: AppMusicPlayerMachineState;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
};

const TheMusicPlayerMini: React.FC<TheMusicPlayerMiniProps> = ({
    machineState,
    height,
    sendToMachine,
}) => {
    const { context } = machineState;
    const { currentTrack } = context;
    const isInRoom = context.roomID !== '';
    const isPlaying = machineState.hasTag('playerOnPlay');
    const roomIsReady = machineState.hasTag('roomIsReady');

    function handlePlayPauseToggle() {
        sendToMachine('PLAY_PAUSE_TOGGLE');
    }

    const firstLine = isInRoom
        ? context.name
        : 'Join a room to listen to music';
    const secondLine =
        isInRoom === true && currentTrack
            ? `${currentTrack.title} • ${currentTrack.artistName}`
            : 'Track-Artist';

    return (
        <View
            testID="music-player-mini"
            sx={{
                height,
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 'l',
                paddingRight: 'l',
            }}
        >
            <View
                sx={{
                    flex: 1,
                    justifyContent: 'center',
                    marginRight: 'xl',
                }}
            >
                <Typo numberOfLines={1} sx={{ fontSize: 's' }}>
                    {firstLine}
                </Typo>

                <Typo
                    numberOfLines={1}
                    sx={{ fontSize: 'xs', color: 'greyLighter' }}
                >
                    {secondLine}
                </Typo>
            </View>

            <MusicPlayerControlButton
                iconName={isPlaying ? 'pause' : 'play'}
                variant="normal"
                adjustIconHorizontally={2}
                disabled={!roomIsReady}
                accessibilityLabel={`${
                    isPlaying ? 'Pause the video' : 'Play the video'
                }`}
                onPress={handlePlayPauseToggle}
            />
        </View>
    );
};

export default TheMusicPlayerMini;
