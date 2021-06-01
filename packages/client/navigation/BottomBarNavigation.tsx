/**
 * Learn more about createBottomTabNavigator:
 * https://reactnavigation.org/docs/bottom-tab-navigator
 */

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { ColorModeProps } from '.';
import { tabStyle } from '../constants/Colors';
import HomeScreen from '../screens/HomeScreen';
import SearchTrackScreen from '../screens/SearchTrackScreen';
import { HomeParamsList, SearchTracksParamsList } from '../types';

const BottomTab = createBottomTabNavigator();

const BottomTabComponent: React.FC<ColorModeProps> = ({ colorScheme }) => {
    const style = tabStyle(colorScheme);
    console.log(colorScheme);
    return (
        <BottomTab.Navigator
            initialRouteName="Home"
            tabBarOptions={{ ...style }}
        >
            <BottomTab.Screen
                name="Home"
                component={TabOneNavigator}
                options={{
                    tabBarIcon: ({ color }) => (
                        <TabBarIcon name="home" color={color} />
                    ),
                }}
            />
            <BottomTab.Screen
                name="SearchTracks"
                component={TabTwoNavigator}
                options={{
                    tabBarIcon: ({ color }) => (
                        <TabBarIcon name="search" color={color} />
                    ),
                }}
            />
        </BottomTab.Navigator>
    );
};

// You can explore the built-in icon families and icons on the web at:
// https://icons.expo.fyi/
function TabBarIcon(props: {
    name: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
}) {
    return <Ionicons size={30} style={{ marginBottom: -3 }} {...props} />;
}

// Each tab has its own navigation stack, you can read more about this pattern here:
// https://reactnavigation.org/docs/tab-based-navigation#a-stack-navigator-for-each-tab
const TabOneStack = createStackNavigator<HomeParamsList>();

function TabOneNavigator() {
    return (
        <TabOneStack.Navigator headerMode={'screen'}>
            <TabOneStack.Screen
                name="HomeScreen"
                component={HomeScreen}
                options={{ headerTitle: 'Home', headerShown: false }}
            />
        </TabOneStack.Navigator>
    );
}

const TabTwoStack = createStackNavigator<SearchTracksParamsList>();

function TabTwoNavigator() {
    return (
        <TabTwoStack.Navigator headerMode={'screen'}>
            <TabTwoStack.Screen
                name="SearchTracksScreen"
                component={SearchTrackScreen}
                options={{ headerTitle: 'Search', headerShown: false }}
            />
        </TabTwoStack.Navigator>
    );
}

export default BottomTabComponent;
