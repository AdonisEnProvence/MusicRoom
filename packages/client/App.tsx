import { ReactQueryDevtools } from 'react-query/devtools';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DripsyProvider, Text, View } from 'dripsy';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ImageBackground } from 'react-native';
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
                                            <ImageBackground
                                                source={{
                                                    uri: `https://media-exp1.licdn.com/dms/image/C4D03AQE_UVoK5h2u8w/profile-displayphoto-shrink_200_200/0/1585838395278?e=1632960000&v=beta&t=hPLhVUJU0fzc-y5iFafdhhGrlwhSOJtAQjsCSlSLg7M`,
                                                }}
                                                resizeMode="cover"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Text>Click</Text>
                                            </ImageBackground>
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
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        );
    }
};

export default App;
