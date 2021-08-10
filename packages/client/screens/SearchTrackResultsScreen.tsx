import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { SearchTrackResultsScreenProps } from '../types';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { FlatList } from 'react-native';
import TrackListItem from '../components/Track/TrackListItem';

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

export default SearchTracksResultsScreen;
