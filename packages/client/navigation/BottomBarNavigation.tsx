/**
 * Learn more about createBottomTabNavigator:
 * https://reactnavigation.org/docs/bottom-tab-navigator
 */

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
    createStackNavigator,
    StackScreenProps,
} from '@react-navigation/stack';
import * as React from 'react';
import { RootNavigatorProps } from '.';
import HomeScreen from '../screens/HomeScreen';
import SearchTrackScreen from '../screens/SearchTrackScreen';
import {
    BottomTabParamList,
    HomeParamsList,
    RootStackParamList,
    SearchTracksParamsList,
} from '../types';

const BottomTab = createBottomTabNavigator<BottomTabParamList>();

const BottomTabNavigator: React.FC<
    StackScreenProps<RootStackParamList, 'Root'> & RootNavigatorProps
> = ({ colorScheme }) => {
    // const style = navigationStyle(colorScheme);
    console.log(colorScheme);
    return (
        <BottomTab.Navigator
            initialRouteName="Home"
            tabBarOptions={{ activeTintColor: 'gold' }}
            screenOptions={{}}
            // screenOptions={{
            //     // headerShown: false,
            //     // headerStyle: {
            //     //     backgroundColor: style.backgroundColor,
            //     // },
            //     headerTintColor: style.headerTintColor,
            //     headerTitleStyle: {
            //         fontWeight: style.fontWeight,
            //     },
            //     headerRight: () => (
            //         <Button onPress={() => toggleColorScheme()} title="toto" />
            //     ),
            // }}
        >
            <BottomTab.Screen
                name="Home"
                component={TabOneNavigator}
                options={{
                    tabBarIcon: ({ color }) => (
                        <TabBarIcon name="ios-code" color={color} />
                    ),
                }}
            />
            <BottomTab.Screen
                name="SearchTracks"
                component={TabTwoNavigator}
                options={{
                    tabBarIcon: ({ color }) => (
                        <TabBarIcon name="ios-code" color={color} />
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
        <TabOneStack.Navigator>
            <TabOneStack.Screen
                name="HomeScreen"
                component={HomeScreen}
                options={{ headerTitle: 'Home' }}
            />
        </TabOneStack.Navigator>
    );
}

const TabTwoStack = createStackNavigator<SearchTracksParamsList>();

function TabTwoNavigator() {
    return (
        <TabTwoStack.Navigator>
            <TabTwoStack.Screen
                name="SearchTracksScreen"
                component={SearchTrackScreen}
                options={{ headerTitle: 'Search' }}
            />
        </TabTwoStack.Navigator>
    );
}

export default BottomTabNavigator;
