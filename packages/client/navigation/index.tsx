/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { navigationStyle } from '../constants/Colors';
import SearchTrackResultsScreen from '../screens/SearchTrackResultsScreen';
import SearchTrackScreen from '../screens/SearchTrackScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { RootStackParamList } from '../types';
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
            screenOptions={{ headerShown: false }}
            initialRouteName="Root"
            headerMode={'screen'}
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: style.backgroundColor,
                },
                headerTintColor: style.headerTintColor,
                headerTitleStyle: {
                    fontWeight: style.fontWeight,
                },
            }}
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
                name="SearchTrackResults"
                component={SearchTrackResultsScreen}
                options={{ title: 'Results', headerShown: true }}
            />

            <Stack.Screen
                name="TrackPlayer"
                component={SearchTrackScreen}
                options={{ title: 'Player', headerShown: true }}
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
