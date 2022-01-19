/**
 * Learn more about createBottomTabNavigator:
 * https://reactnavigation.org/docs/bottom-tab-navigator
 */

import { Ionicons } from '@expo/vector-icons';
import {
    BottomTabBarProps,
    BottomTabBar,
    createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSx } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TheMusicPlayer from '../components/TheMusicPlayer';
import { tabStyle } from '../constants/Colors';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import HomeScreen from '../screens/HomeScreen';
import MusicPlaylistEditorListScreen from '../screens/MusicPlaylistEditorLibraryScreen';
import MusicPlaylistEditorRoomScreen from '../screens/MusicPlaylistEditorRoomScreen';
import MusicPlaylistEditorSearchTracksScreen from '../screens/MusicPlaylistEditorSearchTracksScreen';
import SearchTrackScreen from '../screens/SearchTrackScreen';
import {
    BottomTabNavigatorParamList,
    HomeParamsList,
    LibraryParamsList,
    MpeRoomParamsList,
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
    const sx = useSx();

    //This will becomes a problem if we block the app for not loged in user
    //Or this means we wont be displaying the bottomBar if user is not loged in
    const { isFullScreen, setIsFullScreen } = useMusicPlayerContext();

    const insets = useSafeAreaInsets();
    const focusedOptions = descriptors[state.routes[state.index].key].options;

    if (focusedOptions.tabBarVisible === false) {
        return null;
    }

    return (
        <>
            <TheMusicPlayer
                isFullScreen={isFullScreen}
                setIsFullScren={setIsFullScreen}
            />

            <BottomTabBar
                safeAreaInsets={insets}
                state={state}
                descriptors={descriptors}
                navigation={navigation}
                style={sx({
                    backgroundColor: 'greyLight',

                    zIndex: 10,
                    // @ts-expect-error This property is not correctly typed
                    borderTopWidth: 0,
                })}
                activeTintColor="white"
                labelStyle={sx({
                    marginTop: 's',
                    fontSize: 'xs',
                })}
                labelPosition="below-icon"
            />
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
                        <TabBarIcon testID="home-tab" name="home" {...props} />
                    ),
                }}
            />

            <Tab.Screen
                name="Search"
                component={TabSearchNavigator}
                options={{
                    tabBarIcon: (props) => (
                        <TabBarIcon
                            testID="search-tab"
                            name="search"
                            {...props}
                        />
                    ),
                }}
            />

            <Tab.Screen
                name="Library"
                component={TabLibraryNavigator}
                options={{
                    tabBarIcon: (props) => (
                        <TabBarIcon
                            testID="library-tab"
                            name="library"
                            {...props}
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

// You can explore the built-in icon families and icons on the web at:
// https://icons.expo.fyi/
function TabBarIcon({
    size = 22,
    ...props
}: {
    name: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    testID: string;
    size: number;
}) {
    return <Ionicons style={{ marginBottom: -3 }} size={size} {...props} />;
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

const TabLibraryStack = createStackNavigator<LibraryParamsList>();

const TabLibraryNavigator: React.FC = () => {
    return (
        <TabLibraryStack.Navigator headerMode="none">
            <TabLibraryStack.Screen
                name="MpeRooms"
                component={MusicPlaylistEditorListScreen}
                options={{ headerTitle: 'Library', headerShown: false }}
            />

            <TabLibraryStack.Screen
                name="MpeRoom"
                component={MpeRoomNavigator}
                options={{ headerTitle: 'Room', headerShown: false }}
            />
        </TabLibraryStack.Navigator>
    );
};

const MpeRoomStack = createStackNavigator<MpeRoomParamsList>();

const MpeRoomNavigator: React.FC = () => {
    return (
        <MpeRoomStack.Navigator initialRouteName="Room">
            <MpeRoomStack.Screen
                name="Room"
                component={MusicPlaylistEditorRoomScreen}
                options={{ headerTitle: 'Room', headerShown: false }}
            />

            <MpeRoomStack.Screen
                name="SearchTracks"
                component={MusicPlaylistEditorSearchTracksScreen}
                options={{ headerTitle: 'Search tracks', headerShown: false }}
            />
        </MpeRoomStack.Navigator>
    );
};

export default BottomTab;
