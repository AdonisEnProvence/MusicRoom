/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */
import { SearchedTrack } from './machines/searchTrackMachine';

export type RootStackParamList = {
    Chat: undefined;
    // Home: undefined;
    // SearchTrack: undefined;
    Root: undefined;
    SearchTrackResults: {
        tracks: SearchedTrack[];
    };
    TrackPlayer: {
        track: SearchedTrack;
    };
    Settings: undefined;
};

export type BottomTabNavigatorParamList = {
    Home: undefined;
    SearchTracks: undefined;
};

export type HomeParamsList = {
    HomeScreen: undefined;
};

export type SearchTracksParamsList = {
    SearchTracksScreen: undefined;
};
