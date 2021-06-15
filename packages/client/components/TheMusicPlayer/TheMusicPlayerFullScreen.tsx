import { View } from '@dripsy/core';
import { useMachine } from '@xstate/react';
import React, { useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assign, createMachine, Sender } from 'xstate';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
} from '../../machines/appMusicPlayerMachine';
import { AppScreen, AppScreenContainer, Typo } from '../kit';
import AppModalHeader from '../kit/AppModalHeader';
import { MusicPlayerRef } from '../track-vote/MusicPlayer';
import TheMusicPlayerWithControls from './TheMusicPlayerWithControls';

type MusicControlMachineContext = {
    duration: number;
    elapsedTime: number;
};

type MusicControlMachineEvent =
    | { type: 'PLAYER_HAS_BEEN_SET' }
    | { type: 'TRACK_HAS_LOADED' }
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

        initial: 'waitingForPlayerToBeSet',

        states: {
            waitingForPlayerToBeSet: {
                on: {
                    PLAYER_HAS_BEEN_SET: {
                        target: 'waitingForTrackToLoad',
                    },
                },
            },

            waitingForTrackToLoad: {
                on: {
                    TRACK_HAS_LOADED: {
                        target: 'loading',
                    },
                },
            },

            loading: {
                entry: () => {
                    console.log('in loading state');
                },

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
                entry: () => {
                    console.log('in paused state');
                },

                on: {
                    TOGGLE: {
                        target: 'playing',
                    },
                },
            },

            playing: {
                entry: () => {
                    console.log('in playing state');
                },

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

type TheMusicPlayerFullScreenProps = {
    dismissFullScreenPlayer: () => void;
    roomName?: string;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    machineState: AppMusicPlayerMachineState;
};

const TheMusicPlayerFullScreen: React.FC<TheMusicPlayerFullScreenProps> = ({
    dismissFullScreenPlayer,
    roomName,
    sendToMachine,
    machineState,
}) => {
    const roomId = roomName;
    const insets = useSafeAreaInsets();
    const playerRef = useRef<MusicPlayerRef | null>(null);
    const [state, send] = useMachine(musicControlMachine, {
        services: {
            getDuration: () => async (sendBack) => {
                try {
                    const duration = await fetchMusicPlayerTotalDuration();

                    sendBack({
                        type: 'LOAD_DURATION',
                        duration,
                    });
                } catch (err) {
                    console.error(err);
                }
            },

            pollPlayerElapsedTime: () => (sendBack) => {
                console.log('in pollPlayerElapsedTime');

                const INTERVAL = 200;
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                const timerId = setInterval(async () => {
                    try {
                        const elapsedTime = await fetchMusicPlayerElapsedTime();

                        sendBack({
                            type: 'UPDATE_ELAPSED_TIME',
                            elapsedTime,
                        });
                    } catch (err) {
                        console.error(err);
                    }
                }, INTERVAL);

                return () => {
                    clearInterval(timerId);
                };
            },
        },
    });

    function setPlayerRef(ref: MusicPlayerRef) {
        console.log('in setPlayerRef');

        playerRef.current = ref;

        send({
            type: 'PLAYER_HAS_BEEN_SET',
        });
    }

    async function fetchMusicPlayerTotalDuration(): Promise<number> {
        console.log('in fetchMusicPlayerTotalDuration');

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
        console.log('in fetchMusicPlayerElapsedTime');

        const player = playerRef.current;
        if (player === null) {
            throw new Error(
                'playerRef is null, the reference has not been set correctly',
            );
        }

        const elapsedTime: number = await player.getCurrentTime();

        return elapsedTime;
    }

    function handleTrackReady() {
        send({
            type: 'TRACK_HAS_LOADED',
        });
    }

    function handleNextTrackPress() {
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
                    videoId="55SwKPVMVM4"
                    trackTitle="Monde Nouveau"
                    trackArtist="Feu! Chatterton"
                    isPlaying={machineState.matches('connectedToRoom.play')}
                    onTrackReady={handleTrackReady}
                    onPlayingToggle={() => {
                        sendToMachine('PLAY_PAUSE_TOGGLE');
                    }}
                    onNextTrackPress={handleNextTrackPress}
                    elapsedTime={state.context.elapsedTime}
                    totalDuration={state.context.duration}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default TheMusicPlayerFullScreen;
