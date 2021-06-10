import {
    RenderAPI,
    RenderOptions,
    render as rtlRender,
} from '@testing-library/react-native';
import { DripsyProvider } from 'dripsy';
import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colorPalette } from '../constants/Colors';
import { MusicPlayerContextProvider } from '../contexts/MusicPlayerContext';
import { useSocket } from '../hooks/useSocket';
import { ServerSocket, serverSocket } from '../services/websockets';

export type SizeTerms = 'xs' | 's' | 'm' | 'l' | 'xl';
export type BackgroundTerms = 'primary' | 'seconday' | 'white' | 'text';

const AllTheProviders: React.FC = ({ children }) => {
    const socket = useSocket();
    const [colorScheme] = useState<'dark' | 'light'>('dark');
    const palette = colorPalette(colorScheme);
    const theme = {
        colors: {
            ...palette,
        },
        space: {
            none: 0,
            xs: 2,
            s: 4,
            m: 8,
            l: 16,
            xl: 24,
        },
        borderWidths: {
            s: 1,
            m: 2,
            l: 3,
        },
        fontSizes: {
            xs: 14,
            s: 16,
            m: 20,
            l: 24,
            xl: 32,
        },
        radii: {
            s: 5,
            m: 10,
            l: 15,
            full: 9999,
        },
    };

    return (
        <DripsyProvider theme={theme}>
            <SafeAreaProvider
                initialMetrics={{
                    frame: { x: 0, y: 0, width: 0, height: 0 },
                    insets: { top: 0, left: 0, right: 0, bottom: 0 },
                }}
            >
                <MusicPlayerContextProvider socket={socket}>
                    {children}
                </MusicPlayerContextProvider>
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
