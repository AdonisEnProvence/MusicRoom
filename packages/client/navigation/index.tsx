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
import SearchTrackScreen from '../screens/SearchTrackScreen';
import { RootStackParamList } from '../types';
import LinkingConfiguration from './LinkingConfiguration';

export interface RootNavigatorProps {
    toggleColorScheme: () => void;
    colorScheme: 'dark' | 'light';
}

const Navigation: React.FC<RootNavigatorProps> = ({
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

function RootNavigator({ toggleColorScheme, colorScheme }: RootNavigatorProps) {
    const style = navigationStyle(colorScheme);
    console.log(style);
    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="Root"
            screenOptions={{
                headerShown: false,
                headerStyle: {
                    backgroundColor: style.backgroundColor,
                },
                headerTintColor: style.headerTintColor,
                headerTitleStyle: {
                    fontWeight: style.fontWeight,
                },
                headerRight: () => (
                    <Button onPress={() => toggleColorScheme()} title="toto" />
                ),
            }}
        >
            <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ title: 'Chat', headerShown: true }}
            />
            <Stack.Screen name="Root" options={{ headerShown: true }}>
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
        </Stack.Navigator>
    );
}

export default Navigation;
