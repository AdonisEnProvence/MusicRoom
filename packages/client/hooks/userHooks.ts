import { useAppContext, UserContextValue } from '../contexts/AppContext';

export function useUserContext(): UserContextValue {
    const { userContext } = useAppContext();

    return userContext;
}
