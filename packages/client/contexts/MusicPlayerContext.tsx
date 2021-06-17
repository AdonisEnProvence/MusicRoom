import { useMachine } from '@xstate/react';
import React, { useContext, useRef } from 'react';
import { Sender } from 'xstate';
import { MusicPlayerRef } from '../components/TheMusicPlayer/Player';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
    createAppMusicPlayerMachine,
} from '../machines/appMusicPlayerMachine';
import { navigationRef } from '../navigation/RootNavigation';
import { Socket } from '../services/websockets';

interface MusicPlayerContextValue {
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    state: AppMusicPlayerMachineState;
    setPlayerRef: (ref: MusicPlayerRef) => void;
}

const MusicPlayerContext = React.createContext<
    MusicPlayerContextValue | undefined
>(undefined);

type MusicPlayerContextProviderProps = {
    socket: Socket;
};

// TODO: See if we need to optimize the performances
export const MusicPlayerContextProvider: React.FC<MusicPlayerContextProviderProps> =
    ({ socket, children }) => {
        const playerRef = useRef<MusicPlayerRef | null>(null);
        const appMusicPlayerMachine = createAppMusicPlayerMachine({ socket });
        const [state, send] = useMachine(appMusicPlayerMachine, {
            services: {
                getTrackDuration: () => async (sendBack) => {
                    try {
                        const duration = await fetchMusicPlayerTotalDuration();

                        sendBack({
                            type: 'LOADED_TRACK_DURATION',
                            duration,
                        });
                    } catch (err) {
                        console.error(err);
                    }
                },

                pollTrackElapsedTime: () => (sendBack) => {
                    const INTERVAL = 200;
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    const timerId = setInterval(async () => {
                        try {
                            const elapsedTime =
                                await fetchMusicPlayerElapsedTime();

                            sendBack({
                                type: 'UPDATE_CURRENT_TRACK_ELAPSED_TIME',
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
            actions: {
                alertForcedDisconnection: () => {
                    navigationRef.current?.navigate('Alert', {
                        reason: 'FORCED_DISCONNECTION',
                    });
                },
            },
        });

        function setPlayerRef(ref: MusicPlayerRef) {
            playerRef.current = ref;

            send({
                type: 'MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET',
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

        return (
            <MusicPlayerContext.Provider
                value={{
                    sendToMachine: send,
                    state,
                    setPlayerRef,
                }}
            >
                {children}
            </MusicPlayerContext.Provider>
        );
    };

export function useMusicPlayer(): MusicPlayerContextValue {
    const context = useContext(MusicPlayerContext);
    if (context === undefined) {
        throw new Error(
            'useMusicPlayer must be used within a MusicPlayerContextProvider',
        );
    }

    return context;
}
