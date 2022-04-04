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
import UserProfileIndexScreen from '../screens/UserProfile';
import {
    MainStackParamList,
    MusicPlaylistEditorRoomsSearchParamList,
    MusicPlaylistEditorCreationFormParamList,
    MusicTrackVoteChatStackParamList,
    MusicTrackVoteConstraintsDetailsParamList,
    MusicTrackVoteCreationFormParamList,
    MusicTrackVoteUsersListStackParamList,
    MusicTrackVoteUsersSearchStackParamList,
    RootStackParamList,
    SuggestTrackStackParamList,
    UserProfileStackParamsList,
    MusicPlaylistEditorUsersSearchStackParamList,
    MyProfileStackParamsList,
} from '../types';
import { SplashScreen } from '../screens/SplashScreen';
import MusicTrackVoteConstraintsDetailsModal from '../screens/MusicTrackVoteConstraintsDetailsModal';
import MusicPlaylistEditorRoomsSearchScreen from '../screens/MusicPlaylistEditorRoomsSearchScreen';
import MusicPlaylistEditorCreationFormName from '../screens/MusicPlaylistEditorCreationForm/MusicPlaylistEditorCreationFormName';
import MusicPlaylistEditorCreationFormOpeningStatus from '../screens/MusicPlaylistEditorCreationForm/MusicPlaylistEditorCreationFormOpeningStatus';
import MusicPlaylistEditorCreationFormConfirmation from '../screens/MusicPlaylistEditorCreationForm/MusicPlaylistEditorCreationFormConfirmation';
import MusicPlaylistEditorExportToMtvCreationFormConfirmation from '../screens/MusicPlaylistEditorMusicTrackVoteCreationForm/MusicTrackVoteCreationFormConfirmation';
import MusicPlaylistEditorExportToMtvCreationFormName from '../screens/MusicPlaylistEditorMusicTrackVoteCreationForm/MusicTrackVoteCreationFormName';
import MusicPlaylistEditorExportToMtvCreationFormOpeningStatus from '../screens/MusicPlaylistEditorMusicTrackVoteCreationForm/MusicTrackVoteCreationFormOpeningStatus';
import MusicPlaylistEditorExportToMtvCreationFormPhysicalConstraints from '../screens/MusicPlaylistEditorMusicTrackVoteCreationForm/MusicTrackVoteCreationFormPhysicalConstraints';
import MusicPlaylistEditorExportToMtvCreationFormPlayingMode from '../screens/MusicPlaylistEditorMusicTrackVoteCreationForm/MusicTrackVoteCreationFormPlayingMode';
import MusicPlaylistEditorExportToMtvCreationFormVotesConstraints from '../screens/MusicPlaylistEditorMusicTrackVoteCreationForm/MusicTrackVoteCreationFormVotesConstraints';
import MusicPlaylistEditorUsersSearchModal from '../screens/MusicPlaylistEditorUsersSearchModal';
import MyProfileScreen from '../screens/MyProfile';
import MySettingsScreen from '../screens/MySettings';
import UpdateNicknameScreen from '../screens/MySettings/UpdateNickname';
import MyDevicesScreen from '../screens/MyProfile/MyDevices';
import UserMusicPlaylistEditorSearchScreen from '../screens/UserMusicPlaylistEditorSearchScreen';
import UserFollowersSearchScreen from '../screens/UserProfile/UserFollowersSearch';
import UserFollowingSearchScreen from '../screens/UserProfile/UserFollowingSearch';
import MyFollowersSearchScreen from '../screens/MyProfile/MyFollowers';
import MyFollowingSearchScreen from '../screens/MyProfile/MyFollowing';
import SigningInScreen from '../screens/SigningInScreen';
import AuthenticationSignUpFormScreen from '../screens/AuthenticationSignUpForm';
import EmailConfirmationScreen from '../screens/EmailConfirmationScreen';
import PasswordResetConfirmationTokenScreen from '../screens/PasswordResetConfirmationTokenScreen';
import BottomTabNavigator from './BottomBarNavigation';
import LinkingConfiguration from './LinkingConfiguration';
import { isReadyRef, navigationRef } from './RootNavigation';

// Before rendering any navigation stack
// see https://reactnavigation.org/docs/5.x/react-native-screens/
enableScreens(true);

export interface ColorModeProps {
    toggleColorScheme: () => void;
    colorScheme: 'dark' | 'light';
}

const Navigation: React.FC<ColorModeProps> = ({
    toggleColorScheme,
    colorScheme,
}) => {
    const { applicationState } = useAppContext();

    useEffect(() => {
        return () => {
            isReadyRef.current = false;
        };
    }, []);

    if (applicationState === 'SHOW_APPLICATION_LOADER') {
        return <SplashScreen />;
    }

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

            <Toast />
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
const MusicPlaylistEditorExportToMtvCreationFormStack =
    createStackNavigator<MusicTrackVoteCreationFormParamList>();
const MusicPlaylistEditorCreationFormStack =
    createStackNavigator<MusicPlaylistEditorCreationFormParamList>();
const MusicTrackVoteChatStack =
    createStackNavigator<MusicTrackVoteChatStackParamList>();
const MusicTrackVoteConstraintsDetailsStack =
    createStackNavigator<MusicTrackVoteConstraintsDetailsParamList>();
const MusicTrackVoteUsersSearchStack =
    createStackNavigator<MusicTrackVoteUsersSearchStackParamList>();
const MusisPlaylistEditorUsersSearchStack =
    createStackNavigator<MusicPlaylistEditorUsersSearchStackParamList>();
const MusicPlaylistEditorRoomsSearchStack =
    createStackNavigator<MusicPlaylistEditorRoomsSearchParamList>();
const UserProfileStack = createStackNavigator<UserProfileStackParamsList>();
const MyProfileStack = createStackNavigator<MyProfileStackParamsList>();

export const RootNavigator: React.FC<ColorModeProps> = ({ colorScheme }) => {
    const style = navigationStyle(colorScheme);
    const { applicationState } = useAppContext();

    return (
        <RootStack.Navigator
            initialRouteName={
                applicationState === 'UNAUTHENTICATED'
                    ? 'SigningIn'
                    : applicationState === 'EMAIL_NOT_CONFIRMED'
                    ? 'EmailConfirmation'
                    : 'Main'
            }
            mode="modal"
            //Why animationEnabled ?
            //See https://stackoverflow.com/questions/63171131/when-rendering-iframes-with-html-android-crashes-while-navigating-back-to-s
            screenOptions={{ ...style, animationEnabled: false }}
        >
            {applicationState === 'UNAUTHENTICATED' ? (
                <>
                    <RootStack.Screen
                        name="SigningIn"
                        component={SigningInScreen}
                        options={{ headerShown: false }}
                    />
                    <RootStack.Screen
                        name="SignUpFormScreen"
                        component={AuthenticationSignUpFormScreen}
                        options={{ headerShown: false }}
                    />
                    <RootStack.Screen
                        name="PasswordResetConfirmationToken"
                        component={PasswordResetConfirmationTokenScreen}
                        options={{ headerShown: false }}
                    />
                </>
            ) : applicationState === 'EMAIL_NOT_CONFIRMED' ? (
                <RootStack.Screen
                    name="EmailConfirmation"
                    component={EmailConfirmationScreen}
                    options={{ headerShown: false }}
                />
            ) : (
                <>
                    <RootStack.Screen
                        name="Main"
                        component={MainNavigator}
                        options={{ headerShown: false }}
                    />

                    <RootStack.Screen
                        name="SuggestTrack"
                        component={SuggestTrackNavigator}
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />

                    <RootStack.Screen
                        name="MusicTrackVoteUsersList"
                        component={MusicTrackVoteUsersListNavigator}
                        //Should stay
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />

                    <RootStack.Screen
                        name="MusicTrackVoteCreationForm"
                        component={MusicTrackVoteCreationFormNavigator}
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />

                    <RootStack.Screen
                        name="MusicTrackVoteChat"
                        component={MusicTrackVoteChatNavigator}
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />

                    <RootStack.Screen
                        name="MusicTrackVoteConstraintsDetails"
                        component={MusicTrackVoteConstraintsDetailsNavigator}
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />

                    <RootStack.Screen
                        name="MusicTrackVoteUsersSearch"
                        component={MusicTrackVoteUsersSearchNavigator}
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />

                    <RootStack.Screen
                        name="MusicPlaylistEditorUsersSearch"
                        component={MusicPlaylistEditorUsersSearchNavigator}
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />

                    <RootStack.Screen
                        name="MusicPlaylistEditorRoomsSearch"
                        component={MusicPlaylistEditorRoomsSearchNavigator}
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />

                    <RootStack.Screen
                        name="UserProfile"
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                        component={UserProfileNavigator}
                    />

                    <RootStack.Screen
                        name="MyProfile"
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                        component={MyProfileNavigator}
                    />

                    <RootStack.Screen
                        name="MusicPlaylistEditorCreationForm"
                        component={MusicPlaylistEditorCreationFormNavigator}
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />

                    <RootStack.Screen
                        name="MusicPlaylistEditorExportToMtvCreationForm"
                        component={
                            MusicPlaylistEditorExportToMtvCreationFormNavigator
                        }
                        options={{
                            headerShown: false,
                            detachPreviousScreen: false,
                        }}
                    />
                </>
            )}
        </RootStack.Navigator>
    );
};

export const MusicTrackVoteCreationFormNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MusicTrackVoteCreationStack.Navigator
            initialRouteName="MusicTrackVoteCreationFormName"
            screenOptions={{
                ...style,
                headerShown: false,
                detachPreviousScreen: false,
            }}
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
export const MusicPlaylistEditorExportToMtvCreationFormNavigator: React.FC<ColorModeProps> =
    ({ colorScheme }) => {
        const style = navigationStyle(colorScheme);

        return (
            <MusicPlaylistEditorExportToMtvCreationFormStack.Navigator
                initialRouteName="MusicTrackVoteCreationFormName"
                screenOptions={{
                    ...style,
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
            >
                <MusicPlaylistEditorExportToMtvCreationFormStack.Screen
                    name="MusicTrackVoteCreationFormName"
                    component={MusicPlaylistEditorExportToMtvCreationFormName}
                />

                <MusicPlaylistEditorExportToMtvCreationFormStack.Screen
                    name="MusicTrackVoteCreationFormConfirmation"
                    component={
                        MusicPlaylistEditorExportToMtvCreationFormConfirmation
                    }
                />

                <MusicPlaylistEditorExportToMtvCreationFormStack.Screen
                    name="MusicTrackVoteCreationFormOpeningStatus"
                    component={
                        MusicPlaylistEditorExportToMtvCreationFormOpeningStatus
                    }
                />

                <MusicPlaylistEditorExportToMtvCreationFormStack.Screen
                    name="MusicTrackVoteCreationFormPhysicalConstraints"
                    component={
                        MusicPlaylistEditorExportToMtvCreationFormPhysicalConstraints
                    }
                />

                <MusicPlaylistEditorExportToMtvCreationFormStack.Screen
                    name="MusicTrackVoteCreationFormPlayingMode"
                    component={
                        MusicPlaylistEditorExportToMtvCreationFormPlayingMode
                    }
                />

                <MusicPlaylistEditorExportToMtvCreationFormStack.Screen
                    name="MusicTrackVoteCreationFormVotesConstraints"
                    component={
                        MusicPlaylistEditorExportToMtvCreationFormVotesConstraints
                    }
                />
            </MusicPlaylistEditorExportToMtvCreationFormStack.Navigator>
        );
    };

export const MusicPlaylistEditorCreationFormNavigator: React.FC<ColorModeProps> =
    ({ colorScheme }) => {
        const style = navigationStyle(colorScheme);

        return (
            <MusicPlaylistEditorCreationFormStack.Navigator
                initialRouteName="MusicPlaylistEditorCreationFormName"
                screenOptions={{
                    ...style,
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
            >
                <MusicPlaylistEditorCreationFormStack.Screen
                    name="MusicPlaylistEditorCreationFormName"
                    component={MusicPlaylistEditorCreationFormName}
                />

                <MusicPlaylistEditorCreationFormStack.Screen
                    name="MusicPlaylistEditorCreationFormOpeningStatus"
                    component={MusicPlaylistEditorCreationFormOpeningStatus}
                />

                <MusicPlaylistEditorCreationFormStack.Screen
                    name="MusicPlaylistEditorCreationFormConfirmation"
                    component={MusicPlaylistEditorCreationFormConfirmation}
                />
            </MusicPlaylistEditorCreationFormStack.Navigator>
        );
    };

export const SuggestTrackNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <SuggestTrackStack.Navigator
            initialRouteName="SuggestTrackModal"
            screenOptions={{
                ...style,
                headerShown: false,
                detachPreviousScreen: false,
            }}
        >
            <SuggestTrackStack.Screen
                name="SuggestTrackModal"
                component={SuggestTrackModal}
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
            initialRouteName="MusicTrackVoteChatModal"
            screenOptions={{
                ...style,
                headerShown: false,
                detachPreviousScreen: false,
            }}
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
                initialRouteName="MusicTrackVoteConstraintsDetailsModal"
                screenOptions={{
                    ...style,
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
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
            initialRouteName="UserProfileIndex"
            mode="modal"
            screenOptions={{
                ...style,
                headerShown: false,
                detachPreviousScreen: false,
            }}
        >
            <UserProfileStack.Screen
                name="UserProfileIndex"
                options={{
                    title: 'User Profile',
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
                component={UserProfileIndexScreen}
            />

            <UserProfileStack.Screen
                name="UserMusicPlaylistEditorSearchScreen"
                options={{
                    title: 'User MPE Rooms',
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
                component={UserMusicPlaylistEditorSearchScreen}
            />

            <UserProfileStack.Screen
                name="UserFollowersSearch"
                options={{
                    title: 'User Followers',
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
                component={UserFollowersSearchScreen}
            />

            <UserProfileStack.Screen
                name="UserFollowingSearch"
                options={{
                    title: 'User Followers',
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
                component={UserFollowingSearchScreen}
            />
        </UserProfileStack.Navigator>
    );
};

export const MyProfileNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MyProfileStack.Navigator
            initialRouteName="MyProfileIndex"
            mode="modal"
            detachInactiveScreens
            screenOptions={{
                ...style,
                headerShown: false,
                detachPreviousScreen: false,
            }}
        >
            <MyProfileStack.Screen
                name="MyProfileIndex"
                options={{
                    title: 'My Profile',
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
                component={MyProfileScreen}
            />

            <MyProfileStack.Screen
                name="MyDevices"
                options={{
                    title: 'My Devices',
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
                component={MyDevicesScreen}
            />

            <MyProfileStack.Screen
                name="MySettings"
                options={{
                    title: 'My Settings',
                    headerShown: false,
                }}
                component={MySettingsScreen}
            />

            <MyProfileStack.Screen
                name="MySettingsUpdateNickname"
                options={{
                    title: 'Update nickname',
                    headerShown: false,
                }}
                component={UpdateNicknameScreen}
            />

            <MyProfileStack.Screen
                name="MyFollowers"
                options={{
                    title: 'My followers',
                    headerShown: false,
                }}
                component={MyFollowersSearchScreen}
            />

            <MyProfileStack.Screen
                name="MyFollowing"
                options={{
                    title: 'My following',
                    headerShown: false,
                }}
                component={MyFollowingSearchScreen}
            />
        </MyProfileStack.Navigator>
    );
};

export const MusicTrackVoteUsersSearchNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MusicTrackVoteUsersSearchStack.Navigator
            initialRouteName="MusicTrackVoteUsersSearchModal"
            screenOptions={{
                ...style,
                headerShown: false,
                detachPreviousScreen: false,
            }}
        >
            <MusicTrackVoteUsersSearchStack.Screen
                name="MusicTrackVoteUsersSearchModal"
                component={MusicTrackVoteUsersSearchModal}
            />
        </MusicTrackVoteUsersSearchStack.Navigator>
    );
};

export const MusicPlaylistEditorUsersSearchNavigator: React.FC<ColorModeProps> =
    ({ colorScheme }) => {
        const style = navigationStyle(colorScheme);

        return (
            <MusisPlaylistEditorUsersSearchStack.Navigator
                initialRouteName="MusicPlaylistEditorUsersSearchModal"
                screenOptions={{
                    ...style,
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
            >
                <MusisPlaylistEditorUsersSearchStack.Screen
                    name="MusicPlaylistEditorUsersSearchModal"
                    component={MusicPlaylistEditorUsersSearchModal}
                />
            </MusisPlaylistEditorUsersSearchStack.Navigator>
        );
    };

export const MusicPlaylistEditorRoomsSearchNavigator: React.FC<ColorModeProps> =
    ({ colorScheme }) => {
        const style = navigationStyle(colorScheme);

        return (
            <MusicPlaylistEditorRoomsSearchStack.Navigator
                initialRouteName="MusicPlaylistEditorRoomsSearchModal"
                screenOptions={{
                    ...style,
                    headerShown: false,
                    detachPreviousScreen: false,
                }}
            >
                <MusicPlaylistEditorRoomsSearchStack.Screen
                    name="MusicPlaylistEditorRoomsSearchModal"
                    component={MusicPlaylistEditorRoomsSearchScreen}
                />
            </MusicPlaylistEditorRoomsSearchStack.Navigator>
        );
    };

export const MusicTrackVoteUsersListNavigator: React.FC<ColorModeProps> = ({
    colorScheme,
}) => {
    const style = navigationStyle(colorScheme);

    return (
        <MusicTrackVoteUsersListStack.Navigator
            initialRouteName="MusicTrackVoteUsersListModal"
            screenOptions={{
                ...style,
                headerShown: false,
                detachPreviousScreen: false,
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
        <MainStack.Navigator
            initialRouteName="Root"
            screenOptions={{ ...style, headerShown: false }}
        >
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
