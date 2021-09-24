import { useSx, View } from '@dripsy/core';
import { Ionicons } from '@expo/vector-icons';
import { TrackMetadataWithScore } from '@musicroom/types';
import { useNavigation } from '@react-navigation/core';
import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { Sender } from 'xstate';
import {
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent,
} from '../../../machines/appMusicPlayerMachine';
import TrackListItemWithScore from '../../Track/TrackListItemWithScore';

interface TracksListProps {
    context: AppMusicPlayerMachineContext;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
}

interface AddSongButtonProps {
    onPress: () => void;
}

const AddSongButton: React.FC<AddSongButtonProps> = ({ onPress }) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            style={sx({
                position: 'absolute',
                right: 0,
                bottom: 0,
                borderRadius: 'full',
                backgroundColor: 'secondary',
                width: 48,
                height: 48,
                margin: 'm',
                justifyContent: 'center',
                alignItems: 'center',

                // Copy pasted from https://ethercreative.github.io/react-native-shadow-generator/
                shadowColor: '#000',
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,

                elevation: 5,
            })}
            onPress={onPress}
        >
            <Ionicons
                accessibilityLabel="Suggest a track"
                name="add"
                size={32}
                color="white"
                style={{
                    // Necessary to center the icon visually
                    right: -1,
                }}
            />
        </TouchableOpacity>
    );
};

const TracksListTab: React.FC<TracksListProps> = ({
    context,
    sendToMachine,
}) => {
    const navigation = useNavigation();

    if (context.tracks === null) {
        return null;
    }

    function generateTracksListItems(): (
        | { type: 'TRACK'; track: TrackMetadataWithScore }
        | { type: 'SEPARATOR' }
    )[] {
        if (context.tracks === null) {
            return [];
        }

        const formattedTracksListItem = context.tracks.map<{
            type: 'TRACK';
            track: TrackMetadataWithScore;
        }>((track) => ({
            type: 'TRACK',
            track,
        }));
        const firstSuggestedTrackIndex = context.tracks.findIndex(
            (track) => track.score < context.minimumScoreToBePlayed,
        );

        if (
            firstSuggestedTrackIndex === -1 ||
            firstSuggestedTrackIndex === context.tracks.length - 1
        ) {
            return formattedTracksListItem;
        }

        return [
            ...formattedTracksListItem.slice(0, firstSuggestedTrackIndex),
            {
                type: 'SEPARATOR',
            },
            ...formattedTracksListItem.slice(firstSuggestedTrackIndex),
        ];
    }

    const data = generateTracksListItems();

    return (
        <View sx={{ flex: 1 }}>
            <FlatList
                data={data}
                renderItem={({ item, index }) => {
                    if (item.type === 'SEPARATOR') {
                        return (
                            <View
                                sx={{
                                    height: 1,
                                    width: '100%',
                                    backgroundColor: 'white',

                                    marginBottom: 'm',
                                }}
                            />
                        );
                    }

                    const { title, artistName, id: trackID } = item.track;
                    let userHasAlreadyVotedForTrack = false;
                    if (context.userRelatedInformation !== null) {
                        userHasAlreadyVotedForTrack =
                            context.userRelatedInformation.tracksVotedFor.some(
                                (trackIDVotedFor) =>
                                    trackIDVotedFor === trackID,
                            );
                    }

                    return (
                        <View
                            sx={{
                                marginBottom: 'm',
                            }}
                        >
                            <TrackListItemWithScore
                                index={index + 1}
                                title={title}
                                artistName={artistName}
                                score={item.track.score}
                                minimumScore={context.minimumScoreToBePlayed}
                                disabled={userHasAlreadyVotedForTrack}
                                onPress={() => {
                                    sendToMachine({
                                        type: 'VOTE_FOR_TRACK',
                                        trackID,
                                    });
                                }}
                            />
                        </View>
                    );
                }}
                extraData={context}
                keyExtractor={(item, _) => {
                    if (item.type === 'TRACK') {
                        return item.track.id;
                    }
                    return 'SEPARATOR_KEY';
                }}
                style={{ flex: 1 }}
            />

            <AddSongButton
                onPress={() => {
                    navigation.navigate('SuggestTrack');
                }}
            />
        </View>
    );
};

export default TracksListTab;
