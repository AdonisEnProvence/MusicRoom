/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */
import { TrackMetadata } from '@musicroom/types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
    CompositeNavigationProp,
    NavigatorScreenParams,
    RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';

export type ApplicationState =
    | 'SHOW_APPLICATION_LOADER'
    | 'EMAIL_NOT_CONFIRMED'
    | 'AUTHENTICATED'
    | 'UNAUTHENTICATED';

export type NavigateFromRefParams = RootStackParamList;

export type NavigateFromRefRoutes = keyof NavigateFromRefParams;

export type BottomTabNavigatorParamList = {
    Home: NavigatorScreenParams<HomeParamsList>;
    Search: NavigatorScreenParams<SearchTracksParamsList>;
    Library: NavigatorScreenParams<LibraryParamsList>;
};

export type HomeParamsList = {
    HomeScreen: undefined;
};

export type SearchTracksParamsList = {
    SearchTracks: undefined;
    SearchTrackResults: SearchTracksResultsParams;
};

export type LibraryParamsList = {
    MpeRooms: undefined;
    MpeRoom: NavigatorScreenParams<MpeRoomParamsList>;
};

export type MpeRoomParamsList = {
    Room: MpeRoomParams;
    SearchTracks: MpeRoomParams;
};

export type RootStackParamList = {
    Main: NavigatorScreenParams<MainStackParamList>;

    SuggestTrack: NavigatorScreenParams<SuggestTrackStackParamList>;

    MusicTrackVoteCreationForm: NavigatorScreenParams<MusicTrackVoteCreationFormParamList>;

    MusicTrackVoteUsersList: NavigatorScreenParams<MusicTrackVoteUsersListStackParamList>;

    MusicTrackVoteChat: NavigatorScreenParams<MusicTrackVoteChatStackParamList>;

    MusicTrackVoteConstraintsDetails: NavigatorScreenParams<MusicTrackVoteConstraintsDetailsParamList>;

    MusicTrackVoteUsersSearch: NavigatorScreenParams<MusicTrackVoteUsersSearchStackParamList>;

    MusicPlaylistEditorUsersSearch: NavigatorScreenParams<MusicPlaylistEditorUsersSearchStackParamList>;

    MusicPlaylistEditorRoomsSearch: NavigatorScreenParams<MusicPlaylistEditorRoomsSearchParamList>;

    UserProfile: NavigatorScreenParams<UserProfileStackParamsList>;

    MyProfile: NavigatorScreenParams<MyProfileStackParamsList>;

    MusicPlaylistEditorCreationForm: NavigatorScreenParams<MusicPlaylistEditorCreationFormParamList>;
    MusicPlaylistEditorExportToMtvCreationForm: NavigatorScreenParams<MusicTrackVoteCreationFormParamList>;

    SigningIn: undefined;
    EmailConfirmation: undefined;
    PasswordResetConfirmationToken: undefined;
    PasswordResetFinal: undefined;

    SignUpFormScreen: undefined;
};

export type SuggestTrackStackParamList = {
    SuggestTrackModal: undefined;
};

export type MusicTrackVoteCreationFormParamList = {
    MusicTrackVoteCreationFormName: undefined;
    MusicTrackVoteCreationFormOpeningStatus: undefined;
    MusicTrackVoteCreationFormPhysicalConstraints: undefined;
    MusicTrackVoteCreationFormPlayingMode: undefined;
    MusicTrackVoteCreationFormVotesConstraints: undefined;
    MusicTrackVoteCreationFormConfirmation: undefined;
};

export type MusicPlaylistEditorExportToMtvCreationFormParamList = {
    MusicTrackVoteCreationFormName: undefined;
    MusicTrackVoteCreationFormOpeningStatus: undefined;
    MusicTrackVoteCreationFormPhysicalConstraints: undefined;
    MusicTrackVoteCreationFormPlayingMode: undefined;
    MusicTrackVoteCreationFormVotesConstraints: undefined;
    MusicTrackVoteCreationFormConfirmation: undefined;
};

export type MusicTrackVoteUsersListStackParamList = {
    MusicTrackVoteUsersListModal: undefined;
};

export type MusicTrackVoteChatStackParamList = {
    MusicTrackVoteChatModal: undefined;
};

export type MusicTrackVoteConstraintsDetailsParamList = {
    MusicTrackVoteConstraintsDetailsModal: undefined;
};

export type UserProfileStackParamsList = {
    UserProfileIndex: UserProfileParams;
    UserMusicPlaylistEditorSearchScreen: UserProfileParams;
    UserFollowersSearch: UserFollowersSearchParams;
    UserFollowingSearch: UserFollowingSearchParams;
};

export type MyProfileStackParamsList = {
    MyProfileIndex: undefined;
    MyDevices: undefined;
    MySettings: undefined;
    MySettingsUpdateNickname: undefined;
    MyFollowers: undefined;
    MyFollowing: undefined;
};

export type MusicPlaylistEditorCreationFormParamList = {
    MusicPlaylistEditorCreationFormName: undefined;
    MusicPlaylistEditorCreationFormOpeningStatus: undefined;
    MusicPlaylistEditorCreationFormConfirmation: undefined;
};

export type MusicTrackVoteUsersSearchStackParamList = {
    MusicTrackVoteUsersSearchModal: undefined;
};

interface MusicPlaylistEditorUsersSearchModalParams {
    roomID: string;
}

export type MusicPlaylistEditorUsersSearchStackParamList = {
    MusicPlaylistEditorUsersSearchModal: MusicPlaylistEditorUsersSearchModalParams;
};

export type MusicPlaylistEditorRoomsSearchParamList = {
    MusicPlaylistEditorRoomsSearchModal: undefined;
};

export type MainStackParamList = {
    Root: NavigatorScreenParams<BottomTabNavigatorParamList>;

    MusicTrackVoteSearch: undefined;

    SignUpFormScreen: undefined;
};

interface UserProfileParams {
    userID: string;
}

interface UserFollowersSearchParams {
    userID: string;
}

interface UserFollowingSearchParams {
    userID: string;
}

interface SearchTracksResultsParams {
    tracks?: TrackMetadata[];
}

interface MpeRoomParams {
    id: string;
}

/**
 * See https://reactnavigation.org/docs/typescript/#nesting-navigators
 * for more information about typing nested navigators.
 *
 * Please note that two screen MUST NOT have the same name.
 * Otherwise the type safety will be disabled.
 */

export type SuggestTrackModalProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'SuggestTrack'>,
        StackNavigationProp<SuggestTrackStackParamList, 'SuggestTrackModal'>
    >;
    route: RouteProp<SuggestTrackStackParamList, 'SuggestTrackModal'>;
};

export type MusicTrackVoteUsersListModalProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteUsersList'>,
        StackNavigationProp<
            MusicTrackVoteUsersListStackParamList,
            'MusicTrackVoteUsersListModal'
        >
    >;
    route: RouteProp<
        MusicTrackVoteUsersListStackParamList,
        'MusicTrackVoteUsersListModal'
    >;
};

export type MusicTrackVoteCreationFormNameScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteCreationForm'>,
        StackNavigationProp<
            MusicTrackVoteCreationFormParamList,
            'MusicTrackVoteCreationFormName'
        >
    >;

    route: RouteProp<
        MusicTrackVoteCreationFormParamList,
        'MusicTrackVoteCreationFormName'
    >;
};

export type MusicTrackVoteCreationFormOpeningStatusScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteCreationForm'>,
        StackNavigationProp<
            MusicTrackVoteCreationFormParamList,
            'MusicTrackVoteCreationFormOpeningStatus'
        >
    >;

    route: RouteProp<
        MusicTrackVoteCreationFormParamList,
        'MusicTrackVoteCreationFormOpeningStatus'
    >;
};

export type MusicTrackVoteCreationFormPhysicalConstraintsScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteCreationForm'>,
        StackNavigationProp<
            MusicTrackVoteCreationFormParamList,
            'MusicTrackVoteCreationFormPhysicalConstraints'
        >
    >;

    route: RouteProp<
        MusicTrackVoteCreationFormParamList,
        'MusicTrackVoteCreationFormPhysicalConstraints'
    >;
};

export type MusicTrackVoteCreationFormPlayingModeScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteCreationForm'>,
        StackNavigationProp<
            MusicTrackVoteCreationFormParamList,
            'MusicTrackVoteCreationFormPlayingMode'
        >
    >;

    route: RouteProp<
        MusicTrackVoteCreationFormParamList,
        'MusicTrackVoteCreationFormPlayingMode'
    >;
};

export type MusicTrackVoteCreationFormVotesConstraintsScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteCreationForm'>,
        StackNavigationProp<
            MusicTrackVoteCreationFormParamList,
            'MusicTrackVoteCreationFormVotesConstraints'
        >
    >;

    route: RouteProp<
        MusicTrackVoteCreationFormParamList,
        'MusicTrackVoteCreationFormVotesConstraints'
    >;
};

export type MusicTrackVoteCreationFormConfirmationScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteCreationForm'>,
        StackNavigationProp<
            MusicTrackVoteCreationFormParamList,
            'MusicTrackVoteCreationFormConfirmation'
        >
    >;

    route: RouteProp<
        MusicTrackVoteCreationFormParamList,
        'MusicTrackVoteCreationFormConfirmation'
    >;
};

export type MusicTrackVoteSearchScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Main'>,
        StackNavigationProp<MainStackParamList, 'MusicTrackVoteSearch'>
    >;
    route: RouteProp<MainStackParamList, 'MusicTrackVoteSearch'>;
};

export type MusicTrackVoteChatModalProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteChat'>,
        StackNavigationProp<
            MusicTrackVoteChatStackParamList,
            'MusicTrackVoteChatModal'
        >
    >;
    route: RouteProp<
        MusicTrackVoteChatStackParamList,
        'MusicTrackVoteChatModal'
    >;
};

export type MusicTrackVoteUsersSearchModalProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteUsersSearch'>,
        StackNavigationProp<
            MusicTrackVoteUsersSearchStackParamList,
            'MusicTrackVoteUsersSearchModal'
        >
    >;
    route: RouteProp<
        MusicTrackVoteUsersSearchStackParamList,
        'MusicTrackVoteUsersSearchModal'
    >;
};

export type MusicPlaylistEditorUsersSearchModalProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<
            RootStackParamList,
            'MusicPlaylistEditorUsersSearch'
        >,
        StackNavigationProp<
            MusicPlaylistEditorUsersSearchStackParamList,
            'MusicPlaylistEditorUsersSearchModal'
        >
    >;
    route: RouteProp<
        MusicPlaylistEditorUsersSearchStackParamList,
        'MusicPlaylistEditorUsersSearchModal'
    >;
};

export type MusicPlaylistEditorRoomsSearchModalProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<
            RootStackParamList,
            'MusicPlaylistEditorRoomsSearch'
        >,
        StackNavigationProp<
            MusicPlaylistEditorRoomsSearchParamList,
            'MusicPlaylistEditorRoomsSearchModal'
        >
    >;
    route: RouteProp<
        MusicPlaylistEditorRoomsSearchParamList,
        'MusicPlaylistEditorRoomsSearchModal'
    >;
};

export type SignUpFormScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Main'>,
        StackNavigationProp<MainStackParamList, 'SignUpFormScreen'>
    >;
    route: RouteProp<MainStackParamList, 'SignUpFormScreen'>;
};

export type UserProfileIndexScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'UserProfile'>,
        StackNavigationProp<UserProfileStackParamsList, 'UserProfileIndex'>
    >;
    route: RouteProp<UserProfileStackParamsList, 'UserProfileIndex'>;
};

export type UserMusicPlaylistEditorSearchScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'UserProfile'>,
        StackNavigationProp<
            UserProfileStackParamsList,
            'UserMusicPlaylistEditorSearchScreen'
        >
    >;
    route: RouteProp<
        UserProfileStackParamsList,
        'UserMusicPlaylistEditorSearchScreen'
    >;
};

export type UserFollowersSearchScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'UserProfile'>,
        StackNavigationProp<UserProfileStackParamsList, 'UserFollowersSearch'>
    >;
    route: RouteProp<UserProfileStackParamsList, 'UserFollowersSearch'>;
};

export type UserFollowingSearchScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'UserProfile'>,
        StackNavigationProp<UserProfileStackParamsList, 'UserFollowingSearch'>
    >;
    route: RouteProp<UserProfileStackParamsList, 'UserFollowingSearch'>;
};

export type MySettingsScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MyProfile'>,
        StackNavigationProp<MyProfileStackParamsList, 'MySettings'>
    >;
    route: RouteProp<MyProfileStackParamsList, 'MySettings'>;
};

export type MySettingsUpdateNicknameScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MyProfile'>,
        StackNavigationProp<
            MyProfileStackParamsList,
            'MySettingsUpdateNickname'
        >
    >;
    route: RouteProp<MyProfileStackParamsList, 'MySettingsUpdateNickname'>;
};

export type MyProfileScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MyProfile'>,
        StackNavigationProp<MyProfileStackParamsList, 'MyProfileIndex'>
    >;
    route: RouteProp<MyProfileStackParamsList, 'MyProfileIndex'>;
};

export type MyDevicesScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MyProfile'>,
        StackNavigationProp<MyProfileStackParamsList, 'MyDevices'>
    >;
    route: RouteProp<MyProfileStackParamsList, 'MyDevices'>;
};

export type MyFollowersScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MyProfile'>,
        StackNavigationProp<MyProfileStackParamsList, 'MyFollowers'>
    >;
    route: RouteProp<MyProfileStackParamsList, 'MyFollowers'>;
};

export type MyFollowingScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MyProfile'>,
        StackNavigationProp<MyProfileStackParamsList, 'MyFollowing'>
    >;
    route: RouteProp<MyProfileStackParamsList, 'MyFollowing'>;
};

export type HomeTabProps = {
    navigation: CompositeNavigationProp<
        CompositeNavigationProp<
            StackNavigationProp<RootStackParamList, 'Main'>,
            StackNavigationProp<MainStackParamList, 'Root'>
        >,
        BottomTabNavigationProp<BottomTabNavigatorParamList, 'Home'>
    >;
    route: RouteProp<BottomTabNavigatorParamList, 'Home'>;
};

export type SearchTabProps = {
    navigation: CompositeNavigationProp<
        CompositeNavigationProp<
            StackNavigationProp<RootStackParamList, 'Main'>,
            StackNavigationProp<MainStackParamList, 'Root'>
        >,
        BottomTabNavigationProp<BottomTabNavigatorParamList, 'Search'>
    >;
    route: RouteProp<BottomTabNavigatorParamList, 'Search'>;
};

export type HomeTabHomeScreenScreenProps = {
    navigation: CompositeNavigationProp<
        CompositeNavigationProp<
            StackNavigationProp<RootStackParamList, 'Main'>,
            StackNavigationProp<MainStackParamList, 'Root'>
        >,
        CompositeNavigationProp<
            BottomTabNavigationProp<BottomTabNavigatorParamList, 'Home'>,
            StackNavigationProp<HomeParamsList, 'HomeScreen'>
        >
    >;
    route: RouteProp<HomeParamsList, 'HomeScreen'>;
};

export type SearchTabSearchTracksScreenProps = {
    navigation: CompositeNavigationProp<
        CompositeNavigationProp<
            StackNavigationProp<RootStackParamList, 'Main'>,
            StackNavigationProp<MainStackParamList, 'Root'>
        >,
        CompositeNavigationProp<
            BottomTabNavigationProp<BottomTabNavigatorParamList, 'Search'>,
            StackNavigationProp<SearchTracksParamsList, 'SearchTracks'>
        >
    >;
    route: RouteProp<SearchTracksParamsList, 'SearchTracks'>;
};

export type MpeTabMpeRoomsScreenProps = {
    navigation: CompositeNavigationProp<
        CompositeNavigationProp<
            StackNavigationProp<RootStackParamList, 'Main'>,
            StackNavigationProp<MainStackParamList, 'Root'>
        >,
        CompositeNavigationProp<
            BottomTabNavigationProp<BottomTabNavigatorParamList, 'Library'>,
            StackNavigationProp<LibraryParamsList, 'MpeRooms'>
        >
    >;
    route: RouteProp<LibraryParamsList, 'MpeRooms'>;
};

export type MpeTabMpeRoomScreenProps = {
    navigation: CompositeNavigationProp<
        CompositeNavigationProp<
            CompositeNavigationProp<
                StackNavigationProp<RootStackParamList, 'Main'>,
                StackNavigationProp<MainStackParamList, 'Root'>
            >,
            CompositeNavigationProp<
                BottomTabNavigationProp<BottomTabNavigatorParamList, 'Library'>,
                StackNavigationProp<LibraryParamsList, 'MpeRoom'>
            >
        >,
        CompositeNavigationProp<
            StackNavigationProp<LibraryParamsList, 'MpeRoom'>,
            StackNavigationProp<MpeRoomParamsList, 'Room'>
        >
    >;
    route: RouteProp<MpeRoomParamsList, 'Room'>;
};

export type MpeTabMpeSearchTracksScreenProps = {
    navigation: CompositeNavigationProp<
        CompositeNavigationProp<
            CompositeNavigationProp<
                StackNavigationProp<RootStackParamList, 'Main'>,
                StackNavigationProp<MainStackParamList, 'Root'>
            >,
            CompositeNavigationProp<
                BottomTabNavigationProp<BottomTabNavigatorParamList, 'Library'>,
                StackNavigationProp<LibraryParamsList, 'MpeRoom'>
            >
        >,
        CompositeNavigationProp<
            StackNavigationProp<LibraryParamsList, 'MpeRoom'>,
            StackNavigationProp<MpeRoomParamsList, 'SearchTracks'>
        >
    >;
    route: RouteProp<MpeRoomParamsList, 'SearchTracks'>;
};

export type SigningInScreenProps = StackScreenProps<
    RootStackParamList,
    'SigningIn'
>;

export type EmailConfirmationScreenProps = StackScreenProps<
    RootStackParamList,
    'EmailConfirmation'
>;

export type PasswordResetConfirmationTokenScreenProps = StackScreenProps<
    RootStackParamList,
    'PasswordResetConfirmationToken'
>;

export type PasswordResetFinalScreenProps = StackScreenProps<
    RootStackParamList,
    'PasswordResetFinal'
>;
