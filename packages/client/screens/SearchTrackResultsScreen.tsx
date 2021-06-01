import React from 'react';
import TracksSearchResults from '../components/search/TracksSearchResults';
import { SearchTrackResultsScreenProps } from '../types';

const SearchTracksResultsScreen: React.FC<SearchTrackResultsScreenProps> = ({
    route,
}) => {
    const tracks = route.params.tracks;
    return <TracksSearchResults tracks={tracks} />;
};

export default SearchTracksResultsScreen;
