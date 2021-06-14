import { useMachine } from '@xstate/react';
import React, { useContext } from 'react';
import { Sender } from 'xstate';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
    createAppMusicPlayerMachine,
} from '../machines/appMusicPlayerMachine';
import { Socket } from '../services/websockets';

interface MusicPlayerContextValue {
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    state: AppMusicPlayerMachineState;
}

const MusicPlayerContext =
    React.createContext<MusicPlayerContextValue | undefined>(undefined);

type MusicPlayerContextProviderProps = {
    socket: Socket;
};

//FIXME perfs optimizations here
export const MusicPlayerContextProvider: React.FC<MusicPlayerContextProviderProps> =
    ({ socket, children }) => {
        const appMusicPlayerMachine = createAppMusicPlayerMachine({ socket });
        const [state, send] = useMachine(appMusicPlayerMachine);

        return (
            <MusicPlayerContext.Provider
                value={{
                    sendToMachine: send,
                    state,
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
