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
import { useSuggestTracks } from '../contexts/MusicPlayerContext';
import { ActivityIndicator, View } from 'dripsy';

const SuggestTrackResultsModal: React.FC<SearchTrackResultsScreenProps> = ({
    route,
    navigation,
}) => {
    const tracks = route.params.tracks;
    const insets = useSafeAreaInsets();
    const { suggestTracks, showActivityIndicatorOnSuggestionsResultsScreen } =
        useSuggestTracks(exitModal);

    function handleTrackPress(trackId: string) {
        suggestTracks([trackId]);
    }

    function handleGoBack() {
        navigation.goBack();
    }

    function exitModal() {
        navigation.popToTop();
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
                        <View
                            sx={{
                                marginBottom: 'm',
                            }}
                        >
                            <TrackListItem
                                index={index + 1}
                                title={title}
                                artistName={artistName}
                                onPress={() => {
                                    handleTrackPress(id);
                                }}
                            />
                        </View>
                    )}
                    keyExtractor={(_, index) => String(index)}
                />

                {showActivityIndicatorOnSuggestionsResultsScreen === true && (
                    <View
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,

                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <ActivityIndicator size="large" />
                    </View>
                )}
            </AppScreenContainer>
        </AppScreen>
    );
};

export default SuggestTrackResultsModal;
