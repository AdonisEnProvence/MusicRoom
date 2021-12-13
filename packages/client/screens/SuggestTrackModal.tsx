import { ActivityIndicator, View } from 'dripsy';
import React from 'react';
import { useSuggestTracks } from '../hooks/musicPlayerHooks';
import { SuggestTrackModalProps } from '../types';
import AppSuggestTrackScreen from '../components/AppSuggestTrackScreen';

const SuggestTrackModal: React.FC<SuggestTrackModalProps> = ({
    navigation,
}) => {
    const { suggestTracks, showActivityIndicatorOnSuggestionsResultsScreen } =
        useSuggestTracks(exitModal);

    function exitModal() {
        navigation.popToTop();
        navigation.goBack();
    }

    function handleGoBack() {
        navigation.goBack();
    }

    function handleTracksSelected([trackID]: string[]) {
        suggestTracks([trackID]);
    }

    return (
        <AppSuggestTrackScreen
            screenTitle="Suggest Track"
            onTracksSelected={handleTracksSelected}
            onGoBack={handleGoBack}
            Loader={
                showActivityIndicatorOnSuggestionsResultsScreen === true ? (
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
                ) : null
            }
        />
    );
};

export default SuggestTrackModal;
