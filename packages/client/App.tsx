import { ReactQueryDevtools } from 'react-query/devtools';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DripsyProvider, Text, useSx, View } from 'dripsy';
import { AnimatePresence, View as MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
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

const FocusTrapModal: React.FC = () => {
    const sx = useSx();

    return (
        <View
            sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 'xl',
            }}
        >
            <MotiView
                from={{
                    opacity: 0.4,
                }}
                animate={{
                    opacity: 0.4,
                }}
                exit={{
                    opacity: 0,
                }}
                transition={{
                    type: 'timing',
                    duration: 300,
                }}
                style={sx({
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    backgroundColor: 'primary',
                })}
            />

            <MotiView
                from={{
                    opacity: 1,
                    scale: 1,
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                }}
                exit={{
                    opacity: 0,
                    scale: 0.9,
                }}
                transition={{
                    type: 'timing',
                    duration: 300,
                }}
                style={sx({
                    width: '100%',
                    maxWidth: 420,
                    padding: 'l',
                    borderRadius: 'm',
                    backgroundColor: 'rgb(63, 63, 70)',

                    // Copy-pasted from https://ethercreative.github.io/react-native-shadow-generator/
                    shadowColor: '#000',
                    shadowOffset: {
                        width: 0,
                        height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,

                    elevation: 5,
                })}
            >
                <Text
                    sx={{
                        color: 'white',
                        fontSize: 'm',
                        fontWeight: 'bold',
                        textAlign: 'center',
                    }}
                >
                    Focus the application
                </Text>

                <Text
                    sx={{ marginTop: 'l', color: 'white', textAlign: 'center' }}
                >
                    The YouTube player can only work after the whole page has
                    been focused once. Please click anywhere on the page.
                </Text>

                <TouchableOpacity
                    style={sx({
                        marginTop: 'xl',

                        backgroundColor: 'secondary',
                        width: '100%',
                        paddingX: 'l',
                        paddingY: 'm',
                        borderRadius: 's',
                    })}
                >
                    <Text
                        sx={{
                            color: 'white',
                            fontWeight: 'bold',
                            textAlign: 'center',
                        }}
                    >
                        Give focus
                    </Text>
                </TouchableOpacity>
            </MotiView>
        </View>
    );
};

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

                                    <AnimatePresence>
                                        {displayModal && <FocusTrapModal />}
                                    </AnimatePresence>
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
