/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import {
    DarkTheme,
    DefaultTheme,
    NavigationContainer,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { ColorSchemeName } from 'react-native';
import ChatScreen from '../screens/ChatScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchTrackResultsScreen from '../screens/SearchTrackResultsScreen';
import SearchTrackScreen from '../screens/SearchTrackScreen';
import TrackPlayer from '../screens/TrackPlayer';
import { RootStackParamList } from '../types';
import LinkingConfiguration from './LinkingConfiguration';

const Navigation: React.FC<{
    colorScheme: ColorSchemeName;
}> = ({ colorScheme }) => {
    return (
        <NavigationContainer
            linking={LinkingConfiguration}
            theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
            <RootNavigator />
        </NavigationContainer>
    );
};

// A root stack navigator is often used for displaying modals on top of all other content
// Read more here: https://reactnavigation.org/docs/modal
const Stack = createStackNavigator<RootStackParamList>();

function RootNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="Chat"
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ title: 'Chat', headerShown: true }}
            />

            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Home', headerShown: true }}
            />

            <Stack.Screen
                name="SearchTrack"
                component={SearchTrackScreen}
                options={{ title: 'Tracks Search', headerShown: true }}
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
        </Stack.Navigator>
    );
}

export default Navigation;
