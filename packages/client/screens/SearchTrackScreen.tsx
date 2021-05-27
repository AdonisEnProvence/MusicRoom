import { StackScreenProps } from '@react-navigation/stack';
import React from 'react';
import TracksSearch from '../components/search/TracksSearch';
import { RootStackParamList } from '../types';

const SearchTrackScreen: React.FC<
    StackScreenProps<RootStackParamList, 'SearchTrack'>
> = () => {
    return <TracksSearch />;
};

export default SearchTrackScreen;
