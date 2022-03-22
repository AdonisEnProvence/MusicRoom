import { ReactQueryDevtools } from 'react-query/devtools';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DripsyProvider, Text, View } from 'dripsy';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ImageBackground, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppContextProvider } from './contexts/AppContext';
import { SocketContextProvider } from './contexts/SocketContext';
import useCachedResources from './hooks/useCachedResources';
import { useTheme } from './hooks/useTheme';
import Navigation from './navigation';

export type SizeTerms = 'xs' | 's' | 'm' | 'l' | 'xl';
export type BackgroundTerms = 'primary' | 'seconday' | 'white' | 'text';

const queryClient = new QueryClient();

const App: React.FC = () => {
    const isLoadingComplete = useCachedResources();
    const { colorScheme, theme, toggleColorScheme } = useTheme();
    const [displayModal, setDisplayModal] = useState<boolean>(false);

    if (!isLoadingComplete) {
        return null;
    } else {
        return (
            <QueryClientProvider client={queryClient}>
                <DripsyProvider theme={theme}>
                    <SafeAreaProvider>
                        <BottomSheetModalProvider>
                            <SocketContextProvider>
                                <AppContextProvider
                                    setDisplayModal={setDisplayModal}
                                >
                                    {displayModal && (
                                        <View
                                            sx={{
                                                zIndex: '2',
                                                position: 'absolute',
                                                transform: `translate(-50%,-50%)`,
                                                left: '50%',
                                                top: '50%',
                                                width: '40%',
                                                height: '40%',
                                                backgroundColor: 'red',
                                            }}
                                        >
                                            <Text>Click</Text>
                                        </View>
                                    )}
                                    <Navigation
                                        colorScheme={colorScheme}
                                        toggleColorScheme={toggleColorScheme}
                                        sx={{
                                            backgroundColor: 'headerBackground',
                                            flex: 1,
                                        }}
                                    />
                                    <StatusBar
                                        style={
                                            colorScheme === 'dark'
                                                ? 'light'
                                                : 'dark'
                                        }
                                    />
                                </AppContextProvider>
                            </SocketContextProvider>
                        </BottomSheetModalProvider>
                    </SafeAreaProvider>
                </DripsyProvider>

                {Platform.OS === 'web' ? (
                    <ReactQueryDevtools initialIsOpen={false} />
                ) : null}
            </QueryClientProvider>
        );
    }
};

export default App;
