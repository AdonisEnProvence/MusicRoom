import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import TracksSearchResults from '../components/search/TracksSearchResults';
import { SearchTrackResultsScreenProps } from '../types';

const SearchTracksResultsScreen: React.FC<SearchTrackResultsScreenProps> = ({
    route,
}) => {
    const tracks = route.params.tracks;
    return (
        <SafeAreaView>
            <TracksSearchResults tracks={tracks} />
        </SafeAreaView>
    );
};

export default SearchTracksResultsScreen;
