import { useActor } from '@xstate/react';
import { useAppContext, UserContextValue } from '../contexts/AppContext';

export function useUserContext(): UserContextValue {
    const { appUserMachineActorRef } = useAppContext();
    if (appUserMachineActorRef === undefined) {
        throw new Error('User machine has not been invoked yet');
    }

    const [userState, sendToUserMachine] = useActor(appUserMachineActorRef);

    return {
        userState,
        sendToUserMachine,
    };
}
