// RootNavigation.js

import { NavigationContainerRef } from '@react-navigation/native';
import * as React from 'react';
import { NavigateFromRefParams, NavigateFromRefRoutes } from '../types';

export const isReadyRef: React.MutableRefObject<boolean | null> =
    React.createRef();

/**
 *  ☢️ DO NOT navigationRef.current?.navigation directly ☢️
 *  user navigateFromRef() instead as it's react navigation init safe
 */

export const navigationRef = React.createRef<NavigationContainerRef>();

// eslint-disable-next-line
export function navigateFromRef<Route extends NavigateFromRefRoutes>(
    name: NavigateFromRefRoutes,
    params?: NavigateFromRefParams[Route],
): void {
    if (isReadyRef.current && navigationRef.current) {
        // Perform navigation if the app has mounted
        navigationRef.current.navigate(name, params);
    } else {
        console.error('NavigationContainer not mounted');
        // You can decide what to do if the app hasn't mounted
        // You can ignore this, or add these actions to a queue you can call later
    }
}
