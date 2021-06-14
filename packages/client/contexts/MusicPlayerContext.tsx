import { useMachine, useSelector } from '@xstate/react';
import React, { useContext } from 'react';
import { Socket } from '../services/websockets';
import { Sender, State } from 'xstate';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineContext,
    createAppMusicPlayerMachine,
} from '../machines/appMusicPlayerMachine';

interface MusicPlayerContextValue {
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    context: AppMusicPlayerMachineContext;
}

const MusicPlayerContext =
    React.createContext<MusicPlayerContextValue | undefined>(undefined);

function selectContext(
    state: State<AppMusicPlayerMachineContext>,
): AppMusicPlayerMachineContext {
    return state.context;
}

type MusicPlayerContextProviderProps = {
    socket: Socket;
};

export const MusicPlayerContextProvider: React.FC<MusicPlayerContextProviderProps> =
    ({ socket, children }) => {
        const appMusicPlayerMachine = createAppMusicPlayerMachine({ socket });
        const [, send, service] = useMachine(appMusicPlayerMachine);
        const context = useSelector(service, selectContext);

        return (
            <MusicPlayerContext.Provider
                value={{
                    sendToMachine: send,
                    context,
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
