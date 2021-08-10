import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { SearchTrackResultsScreenProps } from '../types';
import { FlatList } from 'react-native';
import TrackListItem from '../components/Track/TrackListItem';

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
                <FlatList
                    data={tracks}
                    renderItem={({
                        item: { id, title, artistName },
                        index,
                    }) => (
                        <TrackListItem
                            index={index + 1}
                            title={title}
                            artistName={artistName}
                            onPress={() => {
                                handleTrackPress(id);
                            }}
                        />
                    )}
                    keyExtractor={(_, index) => String(index)}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default SuggestTrackResultsModal;
