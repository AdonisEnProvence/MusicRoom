import {
    render as rtlRender,
    RenderAPI,
    RenderOptions,
} from '@testing-library/react-native';
import { DripsyProvider } from 'dripsy';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MusicPlayerContextProvider } from '../contexts/MusicPlayerContext';
import { UserContextProvider } from '../contexts/UserContext';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../hooks/useTheme';
import { ServerSocket, serverSocket } from '../services/websockets';

export type SizeTerms = 'xs' | 's' | 'm' | 'l' | 'xl';
export type BackgroundTerms = 'primary' | 'seconday' | 'white' | 'text';

const AllTheProviders: React.FC = ({ children }) => {
    const socket = useSocket();
    const { theme } = useTheme();

    return (
        <DripsyProvider theme={theme}>
            <SafeAreaProvider
                initialMetrics={{
                    frame: { x: 0, y: 0, width: 0, height: 0 },
                    insets: { top: 0, left: 0, right: 0, bottom: 0 },
                }}
            >
                <UserContextProvider socket={socket}>
                    <MusicPlayerContextProvider
                        // eslint-disable-next-line @typescript-eslint/no-empty-function
                        setDisplayModal={(bool) => {}}
                        socket={socket}
                    >
                        {children}
                    </MusicPlayerContextProvider>
                </UserContextProvider>
            </SafeAreaProvider>
        </DripsyProvider>
    );
};

export * from '@testing-library/react-native';

export function render(
    component: React.ReactElement<unknown>,
    options?: RenderOptions,
): RenderAPI & { serverSocket: ServerSocket } {
    const utils = rtlRender(component, {
        wrapper: AllTheProviders,
        ...options,
    });

    return {
        ...utils,
        serverSocket,
    };
}

export function waitForTimeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

export function noop(): void {
    return undefined;
}
