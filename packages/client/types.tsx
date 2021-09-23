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
import { TrackMetadata } from '@musicroom/types';

export type NavigateFromRefParams = {
    Alert: AlertParams;
    HomeScreen: undefined;
} & RootStackParamList &
    MusicTrackVoteCreationFormParamList;

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
    Main: NavigatorScreenParams<MainStackParamList>;

    SuggestTrack: NavigatorScreenParams<SuggestTrackStackParamList>;

    MusicTrackVoteCreationForm: NavigatorScreenParams<MusicTrackVoteCreationFormParamList>;

    MusicTrackVoteUsersList: NavigatorScreenParams<MusicTrackVoteUsersListParamList>;
};

export type SuggestTrackStackParamList = {
    SuggestTrackModal: undefined;
    SuggestTrackResultsModal: SearchTracksResultsParams;
};

export type MusicTrackVoteCreationFormParamList = {
    MusicTrackVoteCreationFormName: undefined;
    MusicTrackVoteCreationFormOpeningStatus: undefined;
    MusicTrackVoteCreationFormPhysicalConstraints: undefined;
    MusicTrackVoteCreationFormPlayingMode: undefined;
    MusicTrackVoteCreationFormVotesConstraints: undefined;
    MusicTrackVoteCreationFormConfirmation: undefined;
};

export type MusicTrackVoteUsersListParamList = {
    MusicTrackVoteUsersListModal: undefined;
};

export type MainStackParamList = {
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
    tracks?: TrackMetadata[];
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

export type SuggestTrackResultsModalProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'SuggestTrack'>,
        StackNavigationProp<
            SuggestTrackStackParamList,
            'SuggestTrackResultsModal'
        >
    >;
    route: RouteProp<SuggestTrackStackParamList, 'SuggestTrackResultsModal'>;
};

export type MusicTrackVoteUsersListModalProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'MusicTrackVoteUsersList'>,
        StackNavigationProp<
            MusicTrackVoteUsersListParamList,
            'MusicTrackVoteUsersListModal'
        >
    >;
    route: RouteProp<
        MusicTrackVoteUsersListParamList,
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

export type ChatScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Main'>,
        StackNavigationProp<MainStackParamList, 'Chat'>
    >;
    route: RouteProp<MainStackParamList, 'Chat'>;
};

export type SettingsScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Main'>,
        StackNavigationProp<MainStackParamList, 'Settings'>
    >;
    route: RouteProp<MainStackParamList, 'Settings'>;
};

export type AlertScreenProps = {
    navigation: CompositeNavigationProp<
        StackNavigationProp<RootStackParamList, 'Main'>,
        StackNavigationProp<MainStackParamList, 'Alert'>
    >;
    route: RouteProp<MainStackParamList, 'Alert'>;
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

export type SearchTrackResultsScreenProps = {
    navigation: CompositeNavigationProp<
        CompositeNavigationProp<
            StackNavigationProp<RootStackParamList, 'Main'>,
            StackNavigationProp<MainStackParamList, 'Root'>
        >,
        CompositeNavigationProp<
            BottomTabNavigationProp<BottomTabNavigatorParamList, 'Search'>,
            StackNavigationProp<SearchTracksParamsList, 'SearchTrackResults'>
        >
    >;
    route: RouteProp<SearchTracksParamsList, 'SearchTrackResults'>;
};
