import { View, Text } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sender } from 'xstate';
import { TracksMetadata } from '@musicroom/types';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
} from '../../machines/appMusicPlayerMachine';
import { AppScreen, AppScreenContainer, Typo } from '../kit';
import AppModalHeader from '../kit/AppModalHeader';
import { MusicPlayerRef } from './Player';
import TheMusicPlayerWithControls from './TheMusicPlayerWithControls';

type TheMusicPlayerFullScreenProps = {
    dismissFullScreenPlayer: () => void;
    roomName: string;
    currentTrack: TracksMetadata;
    nextTracksList: TracksMetadata[];
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    machineState: AppMusicPlayerMachineState;
    setPlayerRef: (ref: MusicPlayerRef) => void;
};

const TheMusicPlayerFullScreen: React.FC<TheMusicPlayerFullScreenProps> = ({
    dismissFullScreenPlayer,
    roomName,
    currentTrack,
    nextTracksList,
    sendToMachine,
    machineState,
    setPlayerRef,
}) => {
    const roomId = roomName;
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
        // TODO: send an event to the state machine
        console.log('play next track');
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
                            {roomId}
                        </Typo>

                        <Typo
                            sx={{
                                fontSize: 's',
                                color: 'greyLighter',
                                marginTop: 'xs',
                            }}
                        >
                            2 Listeners
                        </Typo>
                    </View>
                )}
            />

            <AppScreenContainer>
                <TheMusicPlayerWithControls
                    setPlayerRef={setPlayerRef}
                    videoId={currentTrack.id}
                    trackTitle={currentTrack.title}
                    trackArtist={currentTrack.artistName}
                    isPlaying={isPlaying}
                    onTrackReady={handleTrackReady}
                    onPlayingToggle={handlePlayPauseToggle}
                    onNextTrackPress={handleNextTrackPress}
                    elapsedTime={machineState.context.currentTrackElapsedTime}
                    totalDuration={machineState.context.currentTrackDuration}
                />

                <View sx={{ marginBottom: 'xl' }}>
                    {nextTracksList.map(({ id, title, artistName }) => (
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
