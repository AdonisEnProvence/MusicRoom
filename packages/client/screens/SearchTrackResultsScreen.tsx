import { StackScreenProps } from '@react-navigation/stack';
import React from 'react';
import TracksSearchResults from '../components/search/TracksSearchResults';
import { RootStackParamList } from '../types';

const SearchTracksResultsScreen: React.FC<
    StackScreenProps<RootStackParamList, 'SearchTrackResults'>
> = ({ route }) => {
    const tracks = route.params.tracks;
    return <TracksSearchResults tracks={tracks} />;
};

export default SearchTracksResultsScreen;
