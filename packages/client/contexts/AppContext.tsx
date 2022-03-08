import { useInterpret, useSelector } from '@xstate/react';
import { Sender } from '@xstate/react/lib/types';
import React, { useContext, useMemo, useRef } from 'react';
import { MusicPlayerRef } from '../components/TheMusicPlayer/Player';
import { IS_TEST } from '../constants/Env';
import {
    MusicPlayerFullScreenProps,
    useMusicPlayerToggleFullScreen,
} from '../hooks/musicPlayerToggle';
import {
    AppMachineInterpreter,
    createAppMachine,
} from '../machines/appMachine';
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
import { ApplicationState } from '../types';
import { AppMusicPlaylistsActorRef } from '../machines/appMusicPlaylistsModel';
import { getAppMusicPlaylistsMachineOptions } from '../machines/options/appMusicPlaylistsMachineOptions';
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
    appService: AppMachineInterpreter;
    applicationState: ApplicationState;
    musicPlayerContext: {
        appMusicPlayerMachineActorRef:
            | AppMusicPlayerMachineActorRef
            | undefined;
        setPlayerRef: (ref: MusicPlayerRef) => void;
    } & MusicPlayerFullScreenProps;
    appUserMachineActorRef: AppUserMachineActorRef | undefined;
    appMusicPlaylistsActorRef: AppMusicPlaylistsActorRef | undefined;
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

    const setPlayerRef = (ref: MusicPlayerRef): void => {
        playerRef.current = ref;
    };

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

    const musicPlayerMachineOptions = useMemo(
        () =>
            getMusicPlayerMachineOptions({
                setDisplayModal,
                fetchMusicPlayerElapsedTime,
                setIsFullScreen,
            }),
        [setDisplayModal, setIsFullScreen],
    );
    const userMachineOptions = useMemo(() => getUserMachineOptions(), []);
    const appMusicPlaylistsMachineOptions = useMemo(
        () => getAppMusicPlaylistsMachineOptions(),
        [],
    );

    const appMachine = useMemo(
        () =>
            createAppMachine({
                socket,
                locationPollingTickDelay,
                musicPlayerMachineOptions,
                userMachineOptions,
                appMusicPlaylistsMachineOptions,
            }),
        [
            locationPollingTickDelay,
            musicPlayerMachineOptions,
            socket,
            userMachineOptions,
            appMusicPlaylistsMachineOptions,
        ],
    );
    const appService = useInterpret(appMachine, { devTools: true });

    const userIsUnauthenticated = useSelector(appService, (state) =>
        state.hasTag('userIsUnauthenticated'),
    );
    const hasShowApplicationLoaderTag = useSelector(appService, (state) =>
        state.hasTag('showApplicationLoader'),
    );

    const appMusicPlayerMachineActorRef = useSelector(
        appService,
        (state) => state.children.appMusicPlayerMachine,
    );
    const appUserMachineActorRef = useSelector(
        appService,
        (state) => state.children.appUserMachine,
    );
    const appMusicPlaylistsActorRef = useSelector(
        appService,
        (state) =>
            state.children.appMusicPlaylistsMachine as
                | AppMusicPlaylistsActorRef
                | undefined,
    );

    const applicationState: ApplicationState = useMemo((): ApplicationState => {
        if (userIsUnauthenticated === true) {
            return 'UNAUTHENTICATED';
        }

        const shouldShowSplashScreen =
            hasShowApplicationLoaderTag ||
            appMusicPlayerMachineActorRef === undefined ||
            appUserMachineActorRef === undefined ||
            appMusicPlaylistsActorRef === undefined;

        if (shouldShowSplashScreen === true) {
            return 'SHOW_APPLICATION_LOADER';
        }

        return 'AUTHENTICATED';
    }, [
        userIsUnauthenticated,
        hasShowApplicationLoaderTag,
        appMusicPlayerMachineActorRef,
        appUserMachineActorRef,
        appMusicPlaylistsActorRef,
    ]);

    return (
        <AppContext.Provider
            value={{
                appService,
                applicationState,
                appUserMachineActorRef,
                musicPlayerContext: {
                    appMusicPlayerMachineActorRef,
                    setPlayerRef,
                    isFullScreen,
                    setIsFullScreen,
                    toggleIsFullScreen,
                },
                appMusicPlaylistsActorRef,
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
