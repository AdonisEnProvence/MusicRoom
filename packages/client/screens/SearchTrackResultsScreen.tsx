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
import { useMusicPlayer } from '../contexts/MusicPlayerContext';

const SearchTracksResultsScreen: React.FC<SearchTrackResultsScreenProps> = ({
    route,
}) => {
    const tracks = route.params.tracks;
    const insets = useSafeAreaInsets();
    const { sendToMachine } = useMusicPlayer();

    function handleTrackPress(trackId: string) {
        sendToMachine({
            type: 'CREATE_ROOM',
            roomName: trackId,
            initialTracksIDs: [trackId],
        });
    }

    return (
        <AppScreen>
            <AppScreenHeader title="Results" insetTop={insets.top} />

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

export default SearchTracksResultsScreen;
