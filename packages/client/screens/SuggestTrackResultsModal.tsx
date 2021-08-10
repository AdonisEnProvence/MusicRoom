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

const SuggestTrackResultsModal: React.FC<SearchTrackResultsScreenProps> = ({
    route,
    navigation,
}) => {
    const tracks = route.params.tracks;
    const insets = useSafeAreaInsets();

    // TODO: implement what to do when a track has been pressed
    function handleTrackPress(trackId: string) {
        return undefined;
    }

    function handleGoBack() {
        navigation.goBack();
    }

    return (
        <AppScreen>
            <AppScreenHeader
                title="Results"
                insetTop={insets.top}
                canGoBack
                goBack={handleGoBack}
            />

            <AppScreenContainer>
                <MSFlatList<SearchedTrack>
                    onPress={(item) => {
                        handleTrackPress(item.id);
                    }}
                    data={tracks}
                    Item={(item) => <TrackPreview track={item} />}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default SuggestTrackResultsModal;
