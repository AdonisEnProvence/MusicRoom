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

export type BottomTabNavigatorParamList = {
    Home: NavigatorScreenParams<HomeParamsList>;
    Search: NavigatorScreenParams<SearchTracksParamsList>;
};

export type HomeParamsList = {
    HomeX: undefined;
};

export type SearchTracksParamsList = {
    SearchTracks: undefined;
    SearchTrackResults: {
        tracks: SearchedTrack[];
    };
};

export type RootStackParamList = {
    Root: NavigatorScreenParams<BottomTabNavigatorParamList>;

    MusicTrackVoteSearch: undefined;
    MusicTrackVote: {
        roomId: string;
    };

    Chat: undefined;

    Settings: undefined;
};

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

export type HomeTabHomeXScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Root'>,
        CompositeNavigationProp<
            BottomTabNavigationProp<BottomTabNavigatorParamList, 'Home'>,
            StackNavigationProp<HomeParamsList, 'HomeX'>
        >
    >;
    route: RouteProp<HomeParamsList, 'HomeX'>;
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
