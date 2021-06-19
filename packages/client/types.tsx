/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
    CompositeNavigationProp,
    NavigatorScreenParams,
    RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SearchedTrack } from './machines/searchTrackMachine';

export type NavigateFromRefParams = {
    Alert: AlertParams;
    HomeScreen: undefined;
};

export type NavigateFromRefRoutes = keyof NavigateFromRefParams;

export type BottomTabNavigatorParamList = {
    Home: NavigatorScreenParams<HomeParamsList>;
    Search: NavigatorScreenParams<SearchTracksParamsList>;
};

export type HomeParamsList = {
    HomeScreen: undefined;
};

export type SearchTracksParamsList = {
    SearchTracks: undefined;
    SearchTrackResults: SearchTracksResultsParams;
};

export type RootStackParamList = {
    Root: NavigatorScreenParams<BottomTabNavigatorParamList>;

    MusicTrackVoteSearch: undefined;
    MusicTrackVote: MusicTrackVoteParams;

    Chat: undefined;

    Settings: undefined;

    Alert: AlertParams;
};

interface AlertParams {
    reason: 'FORCED_DISCONNECTION';
}
interface MusicTrackVoteParams {
    roomId: string;
}
interface SearchTracksResultsParams {
    tracks: SearchedTrack[];
}

/**
 * See https://reactnavigation.org/docs/typescript/#nesting-navigators
 * for more information about typing nested navigators.
 *
 * Please note that two screen MUST NOT have the same name.
 * Otherwise the type safety will be disabled.
 */

export type MusicTrackVoteSearchScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'MusicTrackVoteSearch'>;
    route: RouteProp<RootStackParamList, 'MusicTrackVoteSearch'>;
};

export type ChatScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'Chat'>;
    route: RouteProp<RootStackParamList, 'Chat'>;
};

export type SettingsScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'Settings'>;
    route: RouteProp<RootStackParamList, 'Settings'>;
};

export type AlertScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'Alert'>;
    route: RouteProp<RootStackParamList, 'Alert'>;
};

export type HomeTabProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Root'>,
        BottomTabNavigationProp<BottomTabNavigatorParamList, 'Home'>
    >;
    route: RouteProp<BottomTabNavigatorParamList, 'Home'>;
};

export type SearchTabProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Root'>,
        BottomTabNavigationProp<BottomTabNavigatorParamList, 'Search'>
    >;
    route: RouteProp<BottomTabNavigatorParamList, 'Search'>;
};

export type HomeTabHomeScreenScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Root'>,
        CompositeNavigationProp<
            BottomTabNavigationProp<BottomTabNavigatorParamList, 'Home'>,
            StackNavigationProp<HomeParamsList, 'HomeScreen'>
        >
    >;
    route: RouteProp<HomeParamsList, 'HomeScreen'>;
};

export type SearchTabSearchTracksScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Root'>,
        CompositeNavigationProp<
            BottomTabNavigationProp<BottomTabNavigatorParamList, 'Search'>,
            StackNavigationProp<SearchTracksParamsList, 'SearchTracks'>
        >
    >;
    route: RouteProp<SearchTracksParamsList, 'SearchTracks'>;
};

export type SearchTrackResultsScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Root'>,
        CompositeNavigationProp<
            BottomTabNavigationProp<BottomTabNavigatorParamList, 'Search'>,
            StackNavigationProp<SearchTracksParamsList, 'SearchTrackResults'>
        >
    >;
    route: RouteProp<SearchTracksParamsList, 'SearchTrackResults'>;
};
