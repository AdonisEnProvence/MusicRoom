import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    MSFlatList,
} from '../components/kit';
import TrackPreview from '../components/search/TrackPreview';
import { SearchTrackResultsScreenProps } from '../types';
import { SearchedTrack } from '../machines/searchTrackMachine';

const SearchTracksResultsScreen: React.FC<SearchTrackResultsScreenProps> = ({
    route,
    navigation,
}) => {
    const tracks = route.params.tracks;
    const insets = useSafeAreaInsets();

    return (
        <AppScreen>
            <AppScreenHeader title="Results" insetTop={insets.top} />

            <AppScreenContainer>
                <MSFlatList<SearchedTrack>
                    onPress={(item) => {
                        console.log(item);
                        navigation.navigate('TrackPlayer', {
                            track: item,
                        });
                    }}
                    data={tracks}
                    Item={(item) => <TrackPreview track={item} />}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default SearchTracksResultsScreen;
