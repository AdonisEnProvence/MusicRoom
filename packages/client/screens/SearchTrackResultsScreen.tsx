import { View } from 'dripsy';
import React from 'react';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import TrackListItem from '../components/Track/TrackListItem';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import { SearchTrackResultsScreenProps } from '../types';

const SearchTracksResultsScreen: React.FC<SearchTrackResultsScreenProps> = ({
    route,
}) => {
    const tracks = route.params.tracks;
    const insets = useSafeAreaInsets();
    const { sendToMusicPlayerMachine } = useMusicPlayerContext();

    function handleTrackPress(trackId: string) {
        sendToMusicPlayerMachine({
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
                        <View
                            sx={{
                                marginBottom: 'm',
                            }}
                        >
                            <TrackListItem
                                index={index + 1}
                                title={title}
                                trackID={id}
                                artistName={artistName}
                                onPress={() => {
                                    handleTrackPress(id);
                                }}
                            />
                        </View>
                    )}
                    keyExtractor={(_, index) => String(index)}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default SearchTracksResultsScreen;
