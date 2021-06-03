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
import SearchTrackResultsScreen from '../screens/SearchTrackResultsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TrackPlayer from '../screens/TrackPlayer';
import MusicTrackVoteSearchScreen from '../screens/MusicTrackVoteSearchScreen';
import MusicTrackVoteScreen from '../screens/MusicTrackVoteScreen';
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

function RootNavigator({ toggleColorScheme, colorScheme }: ColorModeProps) {
    const style = navigationStyle(colorScheme);
    console.log(style);
    return (
        <Stack.Navigator
            initialRouteName="Root"
            headerMode="screen"
            screenOptions={style}
        >
            <Stack.Screen name="Root" options={{ headerShown: false }}>
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
                options={{ title: 'Track Vote Search', headerShown: false }}
            />
            <Stack.Screen
                name="MusicTrackVote"
                component={MusicTrackVoteScreen}
                options={{ title: 'Track Vote', headerShown: false }}
            />

            <Stack.Screen
                name="SearchTrackResults"
                component={SearchTrackResultsScreen}
                options={{ title: 'Results', headerShown: true }}
            />
            <Stack.Screen
                name="TrackPlayer"
                component={TrackPlayer}
                options={{ title: 'Player', headerShown: true }}
            />
            <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ title: 'Chat', headerShown: true }}
            />
            <Stack.Screen
                name="Settings"
                options={{ title: 'Settings', headerShown: true }}
            >
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
}

export default Navigation;
