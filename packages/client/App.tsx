import { DripsyProvider } from 'dripsy';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useCachedResources from './hooks/useCachedResources';
import useColorScheme from './hooks/useColorScheme';
import Navigation from './navigation';

export type SizeTerms = 's' | 'm' | 'l' | 'xl';
export type BackgroundTerms = 'primary' | 'seconday' | 'tertiary';

const theme = {
    colors: {
        primary: '#212922',
        secondary: '#294936',
        tertiary: '#5B8266',
        text: '#626262',
        background: '#fff',
        success: 'gold',
    },
    space: {
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
        s: 16,
        m: 20,
        l: 24,
        xl: 32,
    },
    radii: {
        s: 5,
        m: 10,
        l: 15,
    },
};

const App: React.FC = () => {
    const isLoadingComplete = useCachedResources();
    const colorScheme = useColorScheme();

    if (!isLoadingComplete) {
        return null;
    } else {
        return (
            <DripsyProvider theme={theme}>
                <SafeAreaProvider>
                    <Navigation colorScheme={colorScheme} />
                    <StatusBar />
                </SafeAreaProvider>
            </DripsyProvider>
        );
    }
};

export default App;
