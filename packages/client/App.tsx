import { DripsyProvider } from 'dripsy';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colorPalette } from './constants/Colors';
import { MusicPlayerContextProvider } from './contexts/MusicPlayerContext';
import useCachedResources from './hooks/useCachedResources';
import Navigation from './navigation';

export type SizeTerms = 'xs' | 's' | 'm' | 'l' | 'xl';
export type BackgroundTerms = 'primary' | 'seconday' | 'white' | 'text';

const App: React.FC = () => {
    const [colorScheme, setColorScheme] = useState<'dark' | 'light'>('dark');
    const isLoadingComplete = useCachedResources();
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

    const toggleColorScheme = () => {
        setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
    };

    if (!isLoadingComplete) {
        return null;
    } else {
        return (
            <DripsyProvider theme={theme}>
                <SafeAreaProvider>
                    <MusicPlayerContextProvider>
                        <Navigation
                            colorScheme={colorScheme}
                            toggleColorScheme={toggleColorScheme}
                            sx={{
                                backgroundColor: 'headerBackground',
                                flex: 1,
                            }}
                        />
                        <StatusBar
                            style={colorScheme === 'dark' ? 'light' : 'dark'}
                        />
                    </MusicPlayerContextProvider>
                </SafeAreaProvider>
            </DripsyProvider>
        );
    }
};

export default App;
