import { Text, View } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sender } from 'xstate';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
} from '../../machines/appMusicPlayerMachine';
import { AppScreen, AppScreenContainer, Typo } from '../kit';
import AppModalHeader from '../kit/AppModalHeader';
import { MusicPlayerRef } from './Player';
import TheMusicPlayerWithControls from './TheMusicPlayerWithControls';

type TheMusicPlayerFullScreenProps = {
    machineState: AppMusicPlayerMachineState;
    dismissFullScreenPlayer: () => void;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    setPlayerRef: (ref: MusicPlayerRef) => void;
};

const TheMusicPlayerFullScreen: React.FC<TheMusicPlayerFullScreenProps> = ({
    machineState,
    dismissFullScreenPlayer,
    sendToMachine,
    setPlayerRef,
}) => {
    const context = machineState.context;
    const insets = useSafeAreaInsets();
    const isPlaying = machineState.hasTag('playerOnPlay');

    function handleTrackReady() {
        sendToMachine({
            type: 'TRACK_HAS_LOADED',
        });
    }

    function handlePlayPauseToggle() {
        sendToMachine('PLAY_PAUSE_TOGGLE');
    }

    function handleNextTrackPress() {
        sendToMachine('GO_TO_NEXT_TRACK');
    }

    return (
        <AppScreen>
            <AppModalHeader
                insetTop={insets.top}
                dismiss={() => {
                    dismissFullScreenPlayer();
                }}
                HeaderLeft={() => (
                    <View sx={{ flex: 1 }}>
                        <Typo numberOfLines={1} sx={{ fontSize: 'm' }}>
                            {context.name}
                        </Typo>

                        <Typo
                            sx={{
                                fontSize: 's',
                                color: 'greyLighter',
                                marginTop: 'xs',
                            }}
                        >
                            {context.users.length} Listeners
                        </Typo>
                    </View>
                )}
            />

            <AppScreenContainer>
                {context.currentTrack && (
                    <TheMusicPlayerWithControls
                        currentTrack={context.currentTrack}
                        setPlayerRef={setPlayerRef}
                        isPlaying={isPlaying}
                        onTrackReady={handleTrackReady}
                        onPlayingToggle={handlePlayPauseToggle}
                        onNextTrackPress={handleNextTrackPress}
                    />
                )}

                <View sx={{ marginBottom: 'xl' }}>
                    {context.tracks &&
                        context.tracks.map(({ id, title, artistName }) => (
                            <View key={id}>
                                <Text sx={{ color: 'white' }}>
                                    {title} {artistName}
                                </Text>
                            </View>
                        ))}
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default TheMusicPlayerFullScreen;
