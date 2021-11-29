/**
 * If you are not familiar with React Navigation, check out the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { enableScreens } from 'react-native-screens';
import { navigationStyle } from '../constants/Colors';
import { useAppContext } from '../contexts/AppContext';
import { AlertScreen } from '../screens/AlertScreen';
import MusicTrackVoteChatModal from '../screens/MusicTrackVoteChatModal';
import MusicTrackVoteCreationFormConfirmation from '../screens/MusicTrackVoteCreationFormConfirmation';
import MusicTrackVoteCreationFormName from '../screens/MusicTrackVoteCreationFormName';
import MusicTrackVoteCreationFormOpeningStatus from '../screens/MusicTrackVoteCreationFormOpeningStatus';
import MusicTrackVoteCreationFormPhysicalConstraints from '../screens/MusicTrackVoteCreationFormPhysicalConstraints';
import MusicTrackVoteCreationFormPlayingMode from '../screens/MusicTrackVoteCreationFormPlayingMode';
import MusicTrackVoteCreationFormVotesConstraints from '../screens/MusicTrackVoteCreationFormVotesConstraints';
import MusicTrackVoteSearchScreen from '../screens/MusicTrackVoteSearchScreen';
import MusicTrackVoteUsersListModal from '../screens/MusicTrackVoteUsersListModal';
import MusicTrackVoteUsersSearchModal from '../screens/MusicTrackVoteUsersSearchModal';
import SettingsScreen from '../screens/SettingsScreen';
import SuggestTrackModal from '../screens/SuggestTrackModal';
import SuggestTrackResultsModal from '../screens/SuggestTrackResultsModal';
import UserProfileScreen from '../screens/UserProfile';
import {
    MainStackParamList,
    MusicTrackVoteChatStackParamList,
    MusicTrackVoteConstraintsDetailsParamList,
    MusicTrackVoteCreationFormParamList,
    MusicTrackVoteUsersListStackParamList,
    MusicTrackVoteUsersSearchStackParamList,
    RootStackParamList,
    SuggestTrackStackParamList,
    UserProfileStackParamsList,
} from '../types';
import { SplashScreen } from '../screens/SplashScreen';
import MusicTrackVoteConstraintsDetailsModal from '../screens/MusicTrackVoteConstraintsDetailsModal';
import BottomTabNavigator from './BottomBarNavigation';
import LinkingConfiguration from './LinkingConfiguration';
import { isReadyRef, navigationRef } from './RootNavigation';

// Before rendering any navigation stack
// see https://reactnavigation.org/docs/5.x/react-native-screens/
// enableScreens(true);

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
const MusicTrackVoteUsersListStack =
    createStackNavigator<MusicTrackVoteUsersListStackParamList>();
const MusicTrackVoteCreationStack =
    createStackNavigator<MusicTrackVoteCreationFormParamList>();
const MusicTrackVoteChatStack =
    createStackNavigator<MusicTrackVoteChatStackParamList>();
const MusicTrackVoteConstraintsDetailsStack =
    createStackNavigator<MusicTrackVoteConstraintsDetailsParamList>();
const MusicTrackVoteUsersSearchStack =
    createStackNavigator<MusicTrackVoteUsersSearchStackParamList>();
const UserProfileStack = createStackNavigator<UserProfileStackParamsList>();

export const RootNavigator: React.FC<ColorModeProps> = ({ colorScheme }) => {
    const style = navigationStyle(colorScheme);
    const { applicationState } = useAppContext();

    if (applicationState === 'SHOW_APPLICATION_LOADER') {
        return <SplashScreen />;
    }

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

            <RootStack.Screen
                name="MusicTrackVoteUsersList"
                component={MusicTrackVoteUsersListNavigator}
                //Should stay
                options={{ headerShown: false, detachPreviousScreen: false }}
            />

            <RootStack.Screen
                name="MusicTrackVoteCreationForm"
                component={MusicTrackVoteCreationFormNavigator}
                options={{ headerShown: false, detachPreviousScreen: false }}
            />

            <RootStack.Screen
                name="MusicTrackVoteChat"
                component={MusicTrackVoteChatNavigator}
                options={{ headerShown: false }}
            />

            <RootStack.Screen
                name="MusicTrackVoteConstraintsDetails"
                component={MusicTrackVoteConstraintsDetailsNavigator}
                options={{ headerShown: false, detachPreviousScreen: false }}
            />

            <RootStack.Screen
                name="MusicTrackVoteUsersSearch"
                component={MusicTrackVoteUsersSearchNavigator}
                options={{ headerShown: false }}
            />

            <RootStack.Screen
                name="UserProfile"
                options={{
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
                component={UserProfileNavigator}
            />
        </RootStack.Navigator>
    );
};

export const MusicTrackVoteCreationFormNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MusicTrackVoteCreationStack.Navigator
            mode={'modal'}
            initialRouteName="MusicTrackVoteCreationFormName"
            screenOptions={{ ...style, headerShown: false }}
        >
            <MusicTrackVoteCreationStack.Screen
                name="MusicTrackVoteCreationFormName"
                component={MusicTrackVoteCreationFormName}
            />
            <MusicTrackVoteCreationStack.Screen
                name="MusicTrackVoteCreationFormOpeningStatus"
                component={MusicTrackVoteCreationFormOpeningStatus}
            />
            <MusicTrackVoteCreationStack.Screen
                name="MusicTrackVoteCreationFormPhysicalConstraints"
                component={MusicTrackVoteCreationFormPhysicalConstraints}
            />
            <MusicTrackVoteCreationStack.Screen
                name="MusicTrackVoteCreationFormPlayingMode"
                component={MusicTrackVoteCreationFormPlayingMode}
            />
            <MusicTrackVoteCreationStack.Screen
                name="MusicTrackVoteCreationFormVotesConstraints"
                component={MusicTrackVoteCreationFormVotesConstraints}
            />
            <MusicTrackVoteCreationStack.Screen
                name="MusicTrackVoteCreationFormConfirmation"
                component={MusicTrackVoteCreationFormConfirmation}
            />
        </MusicTrackVoteCreationStack.Navigator>
    );
};

export const SuggestTrackNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <SuggestTrackStack.Navigator
            mode="modal"
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

export const MusicTrackVoteChatNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MusicTrackVoteChatStack.Navigator
            mode="modal"
            initialRouteName="MusicTrackVoteChatModal"
            screenOptions={{ ...style, headerShown: false }}
        >
            <MusicTrackVoteChatStack.Screen
                name="MusicTrackVoteChatModal"
                component={MusicTrackVoteChatModal}
            />
        </MusicTrackVoteChatStack.Navigator>
    );
};

export const MusicTrackVoteConstraintsDetailsNavigator: React.FC<ColorModeProps> =
    ({ colorScheme }) => {
        const style = navigationStyle(colorScheme);

        return (
            <MusicTrackVoteConstraintsDetailsStack.Navigator
                mode="modal"
                initialRouteName="MusicTrackVoteConstraintsDetailsModal"
                screenOptions={{ ...style, headerShown: false }}
            >
                <MusicTrackVoteConstraintsDetailsStack.Screen
                    name="MusicTrackVoteConstraintsDetailsModal"
                    component={MusicTrackVoteConstraintsDetailsModal}
                />
            </MusicTrackVoteConstraintsDetailsStack.Navigator>
        );
    };

export const UserProfileNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <UserProfileStack.Navigator
            initialRouteName="UserProfile"
            mode="modal"
            screenOptions={{ ...style, headerShown: false }}
        >
            <UserProfileStack.Screen
                name="UserProfile"
                options={{
                    title: 'User Profile',
                    headerShown: false,
                }}
                component={UserProfileScreen}
            />
        </UserProfileStack.Navigator>
    );
};

export const MusicTrackVoteUsersSearchNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MusicTrackVoteUsersSearchStack.Navigator
            mode="modal"
            initialRouteName="MusicTrackVoteUsersSearchModal"
            screenOptions={{ ...style, headerShown: false }}
        >
            <MusicTrackVoteUsersSearchStack.Screen
                name="MusicTrackVoteUsersSearchModal"
                component={MusicTrackVoteUsersSearchModal}
            />
        </MusicTrackVoteUsersSearchStack.Navigator>
    );
};

export const MusicTrackVoteUsersListNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MusicTrackVoteUsersListStack.Navigator
            mode="modal"
            initialRouteName="MusicTrackVoteUsersListModal"
            screenOptions={{
                ...style,
                headerShown: false,
            }}
        >
            <MusicTrackVoteUsersListStack.Screen
                name="MusicTrackVoteUsersListModal"
                component={MusicTrackVoteUsersListModal}
            />
        </MusicTrackVoteUsersListStack.Navigator>
    );
};

const MainNavigator: React.FC<ColorModeProps> = ({
    toggleColorScheme,
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MainStack.Navigator screenOptions={{ ...style, headerShown: false }}>
            <MainStack.Screen name="Root" component={BottomTabNavigator} />

            <MainStack.Screen
                name="MusicTrackVoteSearch"
                component={MusicTrackVoteSearchScreen}
                options={{ title: 'Track Vote Search' }}
            />

            <MainStack.Screen
                name="Settings"
                options={{ title: 'Settings' }}
                component={SettingsScreen}
            />

            <MainStack.Screen name="Alert" component={AlertScreen} />
        </MainStack.Navigator>
    );
};

export default Navigation;
