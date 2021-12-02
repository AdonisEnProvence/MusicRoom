/**
 * Learn more about createBottomTabNavigator:
 * https://reactnavigation.org/docs/bottom-tab-navigator
 */

import { Ionicons } from '@expo/vector-icons';
import {
    BottomTabBarProps,
    createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, useDripsyTheme, View } from 'dripsy';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TheMusicPlayer from '../components/TheMusicPlayer';
import { tabStyle } from '../constants/Colors';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import HomeScreen from '../screens/HomeScreen';
import SearchTrackScreen from '../screens/SearchTrackScreen';
import {
    BottomTabNavigatorParamList,
    HomeParamsList,
    SearchTracksParamsList,
} from '../types';

const Tab = createBottomTabNavigator<BottomTabNavigatorParamList>();

/**
 * See https://reactnavigation.org/docs/bottom-tab-navigator#tabbar.
 */
const TabBar: React.FC<BottomTabBarProps> = ({
    state,
    descriptors,
    navigation,
}) => {
    //This will becomes a problem if we block the app for not loged in user
    //Or this means we wont be displaying the bottomBar if user is not loged in
    const { isFullScreen, setIsFullScreen } = useMusicPlayerContext();

    const insets = useSafeAreaInsets();
    const { theme } = useDripsyTheme();
    const focusedOptions = descriptors[state.routes[state.index].key].options;

    if (focusedOptions.tabBarVisible === false) {
        return null;
    }

    // greyLighter is not available on dripsy.ColorModesScale type
    // but we add it to the theme on runtime.
    const greyLighter = (theme.colors as any).greyLighter;

    return (
        <>
            <TheMusicPlayer
                isFullScreen={isFullScreen}
                setIsFullScren={setIsFullScreen}
            />

            <View
                sx={{
                    backgroundColor: 'greyLight',

                    paddingBottom: insets.bottom,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                    zIndex: 10,
                }}
            >
                <View sx={{ flexDirection: 'row' }}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const label =
                            options.tabBarLabel !== undefined
                                ? options.tabBarLabel
                                : options.title !== undefined
                                ? options.title
                                : route.name;
                        const icon = options.tabBarIcon;
                        if (icon === undefined) {
                            throw new Error(
                                `An icon must be set for screen ${route.name}`,
                            );
                        }

                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        const onLongPress = () => {
                            navigation.emit({
                                type: 'tabLongPress',
                                target: route.key,
                            });
                        };

                        return (
                            <TouchableOpacity
                                key={route.name}
                                accessibilityRole="button"
                                accessibilityState={
                                    isFocused ? { selected: true } : {}
                                }
                                accessibilityLabel={
                                    options.tabBarAccessibilityLabel
                                }
                                testID={options.tabBarTestID}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                style={{ flex: 1 }}
                            >
                                <View
                                    sx={{
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        paddingTop: 'm',
                                    }}
                                >
                                    {icon({
                                        color: isFocused
                                            ? 'white'
                                            : greyLighter,
                                        focused: isFocused,
                                        size: 24,
                                    })}

                                    <Text
                                        sx={{
                                            color: isFocused
                                                ? 'white'
                                                : 'greyLighter',
                                            marginTop: 'm',
                                            fontSize: 'xs',
                                        }}
                                    >
                                        {label}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </>
    );
};

const BottomTab: React.FC = () => {
    const style = tabStyle('dark');

    return (
        <Tab.Navigator
            initialRouteName="Home"
            tabBarOptions={{ ...style }}
            tabBar={(props) => <TabBar {...props} />}
        >
            <Tab.Screen
                name="Home"
                component={TabHomeNavigator}
                options={{
                    tabBarIcon: (props) => (
                        <TabBarIcon name="home" {...props} />
                    ),
                }}
            />
            <Tab.Screen
                name="Search"
                component={TabSearchNavigator}
                options={{
                    tabBarIcon: (props) => (
                        <TabBarIcon name="search" {...props} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

// You can explore the built-in icon families and icons on the web at:
// https://icons.expo.fyi/
function TabBarIcon(props: {
    name: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    size: number;
}) {
    return <Ionicons style={{ marginBottom: -3 }} {...props} />;
}

// Each tab has its own navigation stack, you can read more about this pattern here:
// https://reactnavigation.org/docs/tab-based-navigation#a-stack-navigator-for-each-tab
const TabHomeStack = createStackNavigator<HomeParamsList>();

const TabHomeNavigator: React.FC = () => {
    return (
        <TabHomeStack.Navigator headerMode="screen">
            <TabHomeStack.Screen
                name="HomeScreen"
                component={HomeScreen}
                options={{ headerTitle: 'Home', headerShown: false }}
            />
        </TabHomeStack.Navigator>
    );
};

const TabSearchStack = createStackNavigator<SearchTracksParamsList>();

const TabSearchNavigator: React.FC = () => {
    return (
        <TabSearchStack.Navigator headerMode="none">
            <TabSearchStack.Screen
                name="SearchTracks"
                component={SearchTrackScreen}
                options={{ headerTitle: 'Search', headerShown: false }}
            />
        </TabSearchStack.Navigator>
    );
};

export default BottomTab;
