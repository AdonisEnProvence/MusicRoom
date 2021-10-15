import { useActor, useMachine } from '@xstate/react';
import { Sender } from '@xstate/react/lib/types';
import React, { useContext, useRef } from 'react';
import { MusicPlayerRef } from '../components/TheMusicPlayer/Player';
import { IS_TEST } from '../constants/Env';
import { useGetIsDeviceEmitting } from '../hooks/musicPlayerHooks';
import {
    MusicPlayerFullScreenProps,
    useMusicPlayerToggleFullScreen,
} from '../hooks/musicPlayerToggle';
import { createAppMachine } from '../machines/appMachine';
import {
    AppMusicPlayerMachineActorRef,
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
} from '../machines/appMusicPlayerMachine';
import {
    AppUserMachineActorRef,
    AppUserMachineEvent,
    AppUserMachineState,
} from '../machines/appUserMachine';
import { getMusicPlayerMachineOptions } from '../machines/options/appMusicPlayerMachineOptions';
import { getUserMachineOptions } from '../machines/options/appUserMachineOptions';
import { useSocketContext } from './SocketContext';

export interface UserContextValue {
    sendToUserMachine: Sender<AppUserMachineEvent>;
    userState: AppUserMachineState;
}

export interface MusicPlayerContextValue extends MusicPlayerFullScreenProps {
    sendToMusicPlayerMachine: Sender<AppMusicPlayerMachineEvent>;
    musicPlayerState: AppMusicPlayerMachineState;
    setPlayerRef: (ref: MusicPlayerRef) => void;
    isDeviceEmitting: boolean;
}

interface AppContextValue {
    userContext: UserContextValue;
    musicPlayerContext: MusicPlayerContextValue;
}

type MusicPlayerContextProviderProps = {
    setDisplayModal: (display: boolean) => void;
};

const AppContext = React.createContext<AppContextValue | undefined>(undefined);

export const AppContextProvider: React.FC<MusicPlayerContextProviderProps> = ({
    setDisplayModal,
    children,
}) => {
    const locationPollingTickDelay = IS_TEST ? 250 : 30000;
    const socket = useSocketContext();

    //MusicPlayer ref
    const { isFullScreen, setIsFullScreen, toggleIsFullScreen } =
        useMusicPlayerToggleFullScreen(false);

    const playerRef = useRef<MusicPlayerRef | null>(null);

    function setPlayerRef(ref: MusicPlayerRef) {
        playerRef.current = ref;

        sendToMusicPlayerMachine({
            type: 'MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET',
        });
    }

    async function fetchMusicPlayerElapsedTime(): Promise<number> {
        const player = playerRef.current;
        if (player === null) {
            throw new Error(
                'playerRef is null, the reference has not been set correctly',
            );
        }

        const elapsedTime: number = await player.getCurrentTime();

        return elapsedTime * 1000;
    }
    ///

    const musicPlayerMachineOptions = getMusicPlayerMachineOptions({
        setDisplayModal,
        fetchMusicPlayerElapsedTime,
        setIsFullScreen,
    });

    const userMachineOptions = getUserMachineOptions();

    const appMusicPlayerMachine = createAppMachine({
        socket,
        locationPollingTickDelay,
        musicPlayerMachineOptions,
        userMachineOptions,
    });
    const [appState, send] = useMachine(appMusicPlayerMachine);

    const appMusicPlayerActor: AppMusicPlayerMachineActorRef =
        appState.children.appMusicPlayerMachine;
    const appUserActor: AppUserMachineActorRef =
        appState.children.appUserMachine;

    const [musicPlayerState, sendToMusicPlayerMachine] =
        useActor(appMusicPlayerActor);
    const [userState, sendToUserMachine] = useActor(appUserActor);

    //MusicPlayer specific hook
    const isDeviceEmitting = useGetIsDeviceEmitting({
        currDeviceID: userState.context.currDeviceID,
        musicPlayerDoesNotHaveRoomIsReadyTag:
            !musicPlayerState.hasTag('roomIsReady'),
        musicPlayerMachineContext: musicPlayerState.context,
    });
    ///

    return (
        <AppContext.Provider
            value={{
                userContext: {
                    sendToUserMachine,
                    userState,
                },
                musicPlayerContext: {
                    sendToMusicPlayerMachine,
                    musicPlayerState,
                    isDeviceEmitting,
                    isFullScreen,
                    setIsFullScreen,
                    toggleIsFullScreen,
                    setPlayerRef,
                },
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export function useAppContext(): AppContextValue {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error(
            'useAppContext must be used within a AppContextProvider',
        );
    }

    return context;
}
