/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { navigationStyle } from '../constants/Colors';
import ChatScreen from '../screens/ChatScreen';
import MusicTrackVoteSearchScreen from '../screens/MusicTrackVoteSearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { RootStackParamList } from '../types';
import BottomTabNavigator from './BottomBarNavigation';
import LinkingConfiguration from './LinkingConfiguration';

export interface ColorModeProps {
    toggleColorScheme: () => void;
    colorScheme: 'dark' | 'light';
}

const Navigation: React.FC<ColorModeProps> = ({
    toggleColorScheme,
    colorScheme,
}) => {
    return (
        <NavigationContainer linking={LinkingConfiguration} theme={undefined}>
            <RootNavigator
                colorScheme={colorScheme}
                toggleColorScheme={toggleColorScheme}
            />
        </NavigationContainer>
    );
};

// A root stack navigator is often used for displaying modals on top of all other content
// Read more here: https://reactnavigation.org/docs/modal
const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC<ColorModeProps> = ({
    toggleColorScheme,
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <Stack.Navigator
            initialRouteName="Root"
            headerMode="screen"
            screenOptions={{ ...style, headerShown: false }}
        >
            <Stack.Screen name="Root">
                {(props) => (
                    <BottomTabNavigator
                        colorScheme={colorScheme}
                        toggleColorScheme={toggleColorScheme}
                        {...props}
                    />
                )}
            </Stack.Screen>

            <Stack.Screen
                name="MusicTrackVoteSearch"
                component={MusicTrackVoteSearchScreen}
                options={{ title: 'Track Vote Search' }}
            />

            <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ title: 'Chat' }}
            />
            <Stack.Screen name="Settings" options={{ title: 'Settings' }}>
                {(props) => (
                    <SettingsScreen
                        colorScheme={colorScheme}
                        toggleColorScheme={toggleColorScheme}
                        {...props}
                    />
                )}
            </Stack.Screen>
        </Stack.Navigator>
    );
};

export default Navigation;
