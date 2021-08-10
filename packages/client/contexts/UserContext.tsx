import { useMachine } from '@xstate/react';
import React, { useContext } from 'react';
import { Sender } from 'xstate';
import {
    AppUserMachineEvent,
    AppUserMachineState,
    createUserMachine,
} from '../machines/appUserMachine';
import { Socket } from '../services/websockets';

type UserContextValue = {
    sendToUserMachine: Sender<AppUserMachineEvent>;
    state: AppUserMachineState;
};

const UserContext = React.createContext<UserContextValue | undefined>(
    undefined,
);

type UserContextProviderProps = {
    socket: Socket;
};

export const UserContextProvider: React.FC<UserContextProviderProps> = ({
    socket,
    children,
}) => {
    const appMusicPlayerMachine = createUserMachine({ socket });
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
