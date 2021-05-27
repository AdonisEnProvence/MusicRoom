/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */
import { SearchedTrack } from './machines/searchTrackMachine';

export type RootStackParamList = {
    Home: undefined;
    SearchTrack: undefined;
    SearchTrackResults: {
        tracks: SearchedTrack[];
    };
};
