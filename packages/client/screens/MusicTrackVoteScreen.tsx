import React, { useRef, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSx, View } from 'dripsy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { assign, createMachine } from 'xstate';
import { MusicTrackVoteScreenProps } from '../types';
import { AppScreen, AppScreenContainer, Typo } from '../components/kit';
import MusicPlayer, {
    MusicPlayerRef,
} from '../components/track-vote/MusicPlayer';
import AppModalHeader from '../components/kit/AppModalHeader';
import { useLayout } from '../hooks/useLayout';
import { Ionicons } from '@expo/vector-icons';
import { useMachine } from '@xstate/react';

function useFormatSeconds(seconds: number): string {
    const truncatedSecondsToMilliseconds = Math.trunc(seconds) * 1000;
    const formattedTime = useMemo(() => {
        const formatter = new Intl.DateTimeFormat('en-US', {
            second: 'numeric',
            minute: 'numeric',
        });

        return formatter.format(truncatedSecondsToMilliseconds);
    }, [truncatedSecondsToMilliseconds]);

    return formattedTime;
}

type MusicPlayerWithControlsProps = {
    videoId: string;
    trackTitle: string;
    trackArtist: string;
    isPlaying: boolean;
    onPlayingToggle: () => void;
    onNextTrackPress: () => void;
    playerRef: React.MutableRefObject<MusicPlayerRef>;
    totalDuration: number;
    elapsedTime: number;
};

type MusicPlayerControlButtonProps = {
    iconName: React.ComponentProps<typeof Ionicons>['name'];
    variant?: 'prominent' | 'normal';
    adjustIconHorizontally?: 2 | 1;
    onPress: () => void;
};

const MusicPlayerControlButton: React.FC<MusicPlayerControlButtonProps> = ({
    iconName,
    adjustIconHorizontally,
    variant = 'normal',
    onPress,
}) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            style={sx({
                width: 56,
                height: 56,
                padding: 'm',
                marginLeft: 'm',
                marginRight: 'm',
                backgroundColor:
                    variant === 'prominent' ? 'white' : 'transparent',
                borderRadius: 'full',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
            })}
            onPress={onPress}
        >
            <Ionicons
                name={iconName}
                style={sx({
                    color: variant === 'prominent' ? 'greyLight' : 'white',
                    fontSize: 'xl',
                    right:
                        adjustIconHorizontally !== undefined
                            ? -1 * adjustIconHorizontally
                            : 0,
                })}
            />
        </TouchableOpacity>
    );
};

const MusicPlayerWithControls: React.FC<MusicPlayerWithControlsProps> = ({
    videoId,
    trackTitle,
    trackArtist,
    isPlaying,
    onPlayingToggle,
    onNextTrackPress,
    playerRef,
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
                playerRef={playerRef}
                videoId={videoId}
                videoState={isPlaying ? 'playing' : 'stopped'}
                playerHeight={playerHeight}
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

type MusicControlMachineContext = {
    duration: number;
    elapsedTime: number;
};

type MusicControlMachineEvent =
    | { type: 'LOAD_DURATION'; duration: number }
    | {
          type: 'TOGGLE';
      }
    | {
          type: 'UPDATE_ELAPSED_TIME';
          elapsedTime: number;
      };

const musicControlMachine = createMachine<
    MusicControlMachineContext,
    MusicControlMachineEvent
>(
    {
        context: {
            duration: 0,
            elapsedTime: 0,
        },

        initial: 'loading',

        states: {
            loading: {
                invoke: {
                    src: 'getDuration',
                },

                on: {
                    LOAD_DURATION: {
                        target: 'paused',
                        actions: 'setDuration',
                    },
                },
            },

            paused: {
                on: {
                    TOGGLE: {
                        target: 'playing',
                    },
                },
            },

            playing: {
                invoke: {
                    src: 'pollPlayerElapsedTime',
                },

                on: {
                    TOGGLE: 'paused',

                    UPDATE_ELAPSED_TIME: {
                        actions: 'setElapsedTime',
                    },
                },
            },
        },
    },
    {
        actions: {
            setElapsedTime: assign((context, event) => {
                if (event.type !== 'UPDATE_ELAPSED_TIME') {
                    return context;
                }

                return {
                    ...context,
                    elapsedTime: event.elapsedTime,
                };
            }),

            setDuration: assign((context, event) => {
                if (event.type !== 'LOAD_DURATION') {
                    return context;
                }

                return {
                    ...context,
                    duration: event.duration,
                };
            }),
        },
    },
);

const MusicTrackVoteScreen: React.FC<MusicTrackVoteScreenProps> = ({
    route,
    navigation,
}) => {
    const roomId = route.params.roomId;
    const insets = useSafeAreaInsets();
    const playerRef = useRef<MusicPlayerRef | null>(null);
    const [state, send] = useMachine(musicControlMachine, {
        services: {
            getDuration: () => (sendBack) => {
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                const timerId = setInterval(async () => {
                    const duration = await fetchMusicPlayerTotalDuration();

                    sendBack({
                        type: 'LOAD_DURATION',
                        duration,
                    });
                }, 100);

                return () => {
                    clearInterval(timerId);
                };
            },

            pollPlayerElapsedTime: () => (sendBack) => {
                const INTERVAL = 200;
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                const timerId = setInterval(async () => {
                    const elapsedTime = await fetchMusicPlayerElapsedTime();

                    sendBack({
                        type: 'UPDATE_ELAPSED_TIME',
                        elapsedTime,
                    });
                }, INTERVAL);

                return () => {
                    clearInterval(timerId);
                };
            },
        },
    });

    function handlePlayingStateToggle() {
        send({
            type: 'TOGGLE',
        });
    }

    async function fetchMusicPlayerTotalDuration(): Promise<number> {
        const player = playerRef.current;
        if (player === null) {
            throw new Error(
                'playerRef is null, the reference has not been set correctly',
            );
        }

        const elapsedTime: number = await player.getDuration();

        return elapsedTime;
    }

    async function fetchMusicPlayerElapsedTime(): Promise<number> {
        const player = playerRef.current;
        if (player === null) {
            throw new Error(
                'playerRef is null, the reference has not been set correctly',
            );
        }

        const elapsedTime: number = await player.getCurrentTime();

        return elapsedTime;
    }

    function handleNextTrackPress() {
        console.log('play next track');
    }

    return (
        <AppScreen>
            <AppModalHeader
                insetTop={insets.top}
                dismiss={() => {
                    navigation.goBack();
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
                <MusicPlayerWithControls
                    playerRef={playerRef}
                    videoId="55SwKPVMVM4"
                    trackTitle="Monde Nouveau"
                    trackArtist="Feu! Chatterton"
                    isPlaying={state.matches('playing')}
                    onPlayingToggle={handlePlayingStateToggle}
                    onNextTrackPress={handleNextTrackPress}
                    elapsedTime={state.context.elapsedTime}
                    totalDuration={state.context.duration}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MusicTrackVoteScreen;
