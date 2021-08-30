/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { navigationStyle } from '../constants/Colors';
import { AlertScreen } from '../screens/AlertScreen';
import ChatScreen from '../screens/ChatScreen';
import MusicTrackVoteSearchScreen from '../screens/MusicTrackVoteSearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SuggestTrackModal from '../screens/SuggestTrackModal';
import SuggestTrackResultsModal from '../screens/SuggestTrackResultsModal';
import {
    MainStackParamList,
    RootStackParamList,
    SuggestTrackStackParamList,
} from '../types';
import BottomTabNavigator from './BottomBarNavigation';
import LinkingConfiguration from './LinkingConfiguration';
import { isReadyRef, navigationRef } from './RootNavigation';

export interface ColorModeProps {
    toggleColorScheme: () => void;
    colorScheme: 'dark' | 'light';
}

const Navigation: React.FC<ColorModeProps> = ({
    toggleColorScheme,
    colorScheme,
}) => {
    useEffect(() => {
        return () => {
            isReadyRef.current = false;
        };
    }, []);

    return (
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                isReadyRef.current = true;
            }}
            linking={LinkingConfiguration}
            theme={undefined}
        >
            <RootNavigator
                colorScheme={colorScheme}
                toggleColorScheme={toggleColorScheme}
            />

            <Toast ref={(ref) => Toast.setRef(ref)} />
        </NavigationContainer>
    );
};

// A root stack navigator is often used for displaying modals on top of all other content
// Read more here: https://reactnavigation.org/docs/modal
const RootStack = createStackNavigator<RootStackParamList>();
const MainStack = createStackNavigator<MainStackParamList>();
const SuggestTrackStack = createStackNavigator<SuggestTrackStackParamList>();

export const RootNavigator: React.FC<ColorModeProps> = ({ colorScheme }) => {
    const style = navigationStyle(colorScheme);

    return (
        <RootStack.Navigator
            initialRouteName="Main"
            mode="modal"
            screenOptions={{ ...style }}
        >
            <RootStack.Screen
                name="Main"
                component={MainNavigator}
                options={{ headerShown: false }}
            />

            <RootStack.Screen
                name="SuggestTrack"
                component={SuggestTrackNavigator}
                options={{ headerShown: false }}
            />
        </RootStack.Navigator>
    );
};

export const SuggestTrackNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <SuggestTrackStack.Navigator
            initialRouteName="SuggestTrackModal"
            screenOptions={{ ...style, headerShown: false }}
        >
            <SuggestTrackStack.Screen
                name="SuggestTrackModal"
                component={SuggestTrackModal}
            />

            <SuggestTrackStack.Screen
                name="SuggestTrackResultsModal"
                component={SuggestTrackResultsModal}
            />
        </SuggestTrackStack.Navigator>
    );
};

const MainNavigator: React.FC<ColorModeProps> = ({
    toggleColorScheme,
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MainStack.Navigator screenOptions={{ ...style, headerShown: false }}>
            <MainStack.Screen name="Root">
                {(props) => (
                    <BottomTabNavigator
                        colorScheme={colorScheme}
                        toggleColorScheme={toggleColorScheme}
                        {...props}
                    />
                )}
            </MainStack.Screen>

            <MainStack.Screen
                name="MusicTrackVoteSearch"
                component={MusicTrackVoteSearchScreen}
                options={{ title: 'Track Vote Search' }}
            />

            <MainStack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ title: 'Chat' }}
            />

            <MainStack.Screen name="Settings" options={{ title: 'Settings' }}>
                {(props) => (
                    <SettingsScreen
                        colorScheme={colorScheme}
                        toggleColorScheme={toggleColorScheme}
                        {...props}
                    />
                )}
            </MainStack.Screen>

            <MainStack.Screen name="Alert" component={AlertScreen} />
        </MainStack.Navigator>
    );
};

export default Navigation;
