import { useMachine } from '@xstate/react';
import React, { useContext } from 'react';
import { Sender } from 'xstate';
import { IS_TEST } from '../constants/Env';
import {
    AppUserMachineEvent,
    AppUserMachineState,
    createUserMachine,
} from '../machines/appUserMachine';
import { useSocketContext } from './SocketContext';

type UserContextValue = {
    sendToUserMachine: Sender<AppUserMachineEvent>;
    state: AppUserMachineState;
};

const UserContext = React.createContext<UserContextValue | undefined>(
    undefined,
);

export const UserContextProvider: React.FC = ({ children }) => {
    const locationPollingTickDelay = IS_TEST ? 250 : 30000;
    const socket = useSocketContext();

    const appMusicPlayerMachine = createUserMachine({
        socket,
        locationPollingTickDelay,
    });
    const [state, send] = useMachine(appMusicPlayerMachine);

    return (
        <UserContext.Provider
            value={{
                sendToUserMachine: send,
                state,
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

export function useUserContext(): UserContextValue {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error(
            'useUserContext must be used within a UserContextProvider',
        );
    }

    return context;
}
