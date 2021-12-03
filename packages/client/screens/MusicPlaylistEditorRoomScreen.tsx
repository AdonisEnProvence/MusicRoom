import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from '@xstate/react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useSx, Text, View } from 'dripsy';
import { datatype, name } from 'faker';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { MpeTabMpeRoomScreenProps } from '../types';
import { useMusicPlaylistsActor } from '../hooks/useMusicPlaylistsActor';
import { MusicPlaylist } from '../machines/appMusicPlaylistsMachine';
import TrackListItem from '../components/Track/TrackListItem';

interface MusicPlaylistEditorRoomScreenProps extends MpeTabMpeRoomScreenProps {
    playlist: MusicPlaylist;
}

interface AddTrackButtonProps {
    onPress: () => void;
}

const AddTrackButton: React.FC<AddTrackButtonProps> = ({ onPress }) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            style={sx({
                flexShrink: 0,
                backgroundColor: 'greyLight',
                padding: 'm',
                flexDirection: 'row',
                justifyContent: 'center',
                marginBottom: 'l',
            })}
            onPress={onPress}
        >
            <Text sx={{ color: 'white', textAlign: 'center', fontSize: 'm' }}>
                Add Track
            </Text>
        </TouchableOpacity>
    );
};

const MusicPlaylistEditorRoomScreen: React.FC<MusicPlaylistEditorRoomScreenProps> =
    ({ playlist }) => {
        const insets = useSafeAreaInsets();
        const playlistRef = playlist.ref;
        const tracks = useSelector(
            playlistRef,
            (state) => state.context.tracks,
        );

        function handleAddTrack() {
            playlistRef.send({
                type: 'ADD_TRACK',
                id: datatype.uuid(),
                artistName: name.findName(),
                duration: 0,
                title: name.findName(),
            });
        }

        return (
            <AppScreen>
                <AppScreenHeader
                    title={`Playlist ${playlist.id}`}
                    insetTop={insets.top}
                />

                <AppScreenContainer>
                    <FlatList
                        data={tracks}
                        ListHeaderComponent={() => {
                            return <AddTrackButton onPress={handleAddTrack} />;
                        }}
                        keyExtractor={({ id }) => id}
                        renderItem={({
                            item: { id, title, artistName },
                            index,
                        }) => {
                            return (
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
                                    />
                                </View>
                            );
                        }}
                    />
                </AppScreenContainer>
            </AppScreen>
        );
    };

const MusicPlaylistEditorRoomWrapper: React.FC<MpeTabMpeRoomScreenProps> = (
    props,
) => {
    const { appMusicPlaylistsActorRef } = useMusicPlaylistsActor();
    const playlistID = props.route.params.id;
    const playlist = useSelector(appMusicPlaylistsActorRef, (state) =>
        state.context.playlistsActorsRefs.find(({ id }) => id === playlistID),
    );

    if (playlist === undefined) {
        return null;
    }

    return <MusicPlaylistEditorRoomScreen {...props} playlist={playlist} />;
};

export default MusicPlaylistEditorRoomWrapper;
