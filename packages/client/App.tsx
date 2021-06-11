import { DripsyProvider } from 'dripsy';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MusicPlayerContextProvider } from './contexts/MusicPlayerContext';
import useCachedResources from './hooks/useCachedResources';
import { useSocket } from './hooks/useSocket';
import { useTheme } from './hooks/useTheme';
import Navigation from './navigation';

export type SizeTerms = 'xs' | 's' | 'm' | 'l' | 'xl';
export type BackgroundTerms = 'primary' | 'seconday' | 'white' | 'text';

const App: React.FC = () => {
    const socket = useSocket();
    const isLoadingComplete = useCachedResources();
    const { colorScheme, theme, toggleColorScheme } = useTheme();

    if (!isLoadingComplete) {
        return null;
    } else {
        return (
            <DripsyProvider theme={theme}>
                <SafeAreaProvider>
                    <MusicPlayerContextProvider socket={socket}>
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
