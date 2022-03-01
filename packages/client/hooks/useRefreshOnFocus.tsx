import React from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * This hooks let you trigger given refetch method on screen focus
 * @param refetch the fetch method called on screen focus
 */
export function useRefreshOnFocus<T>(refetch: () => Promise<T>): void {
    const enabledRef = React.useRef(false);

    useFocusEffect(
        React.useCallback(() => {
            if (enabledRef.current) {
                void refetch();
            } else {
                enabledRef.current = true;
            }
        }, [refetch]),
    );
}
