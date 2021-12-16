import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from '@xstate/react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useSx, Text, View } from 'dripsy';
import { View as MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    Typo,
} from '../../components/kit';
import { MpeTabMpeRoomScreenProps } from '../../types';
import { usePlaylist } from '../../hooks/useMusicPlaylistsActor';
import { MusicPlaylist } from '../../machines/appMusicPlaylistsMachine';
import TrackListItem from '../../components/Track/TrackListItem';
import { PlaylistActorRef } from '../../machines/playlistMachine';

interface MusicPlaylistEditorRoomScreenProps extends MpeTabMpeRoomScreenProps {
    playlist: MusicPlaylist;
}

interface AddTrackButtonProps {
    disabled: boolean;
    onPress: () => void;
}

const AddTrackButton: React.FC<AddTrackButtonProps> = ({
    disabled,
    onPress,
}) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            disabled={disabled}
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

interface TrackListItemActionsProps {
    disabled: boolean;
    disabledMoveUp: boolean;
    disabledMoveDown: boolean;
    onUpPress: () => void;
    onDownPress: () => void;
    onDeletePress: () => void;
}

const TrackListItemActions = ({
    disabled,
    disabledMoveUp,
    disabledMoveDown,
    onUpPress,
    onDownPress,
    onDeletePress,
}: TrackListItemActionsProps) => {
    const sx = useSx();

    return (
        <View sx={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
                sx={{
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    marginRight: 'm',
                }}
            >
                <TouchableOpacity
                    accessibilityLabel="Move up"
                    disabled={disabled || disabledMoveUp}
                    style={sx({
                        backgroundColor: 'greyLighter',
                        padding: 's',
                        borderTopLeftRadius: 's',
                        borderBottomLeftRadius: 's',
                    })}
                    onPress={onUpPress}
                >
                    <Ionicons name="chevron-up" color="white" size={18} />
                </TouchableOpacity>

                <View sx={{ width: 1, backgroundColor: 'white' }} />

                <TouchableOpacity
                    accessibilityLabel="Move down"
                    disabled={disabled || disabledMoveDown}
                    style={sx({
                        backgroundColor: 'greyLighter',
                        padding: 's',
                        borderTopRightRadius: 's',
                        borderBottomRightRadius: 's',
                    })}
                    onPress={onDownPress}
                >
                    <Ionicons name="chevron-down" color="white" size={18} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                accessibilityLabel="Delete"
                disabled={disabled}
                style={sx({
                    padding: 's',
                })}
                onPress={onDeletePress}
            >
                <Ionicons name="trash" color="white" size={18} />
            </TouchableOpacity>
        </View>
    );
};

interface TrackListItemWrapperProps {
    playlistRef: PlaylistActorRef;
    shouldFreezeUi: boolean;
    id: string;
    onUpPress: () => void;
    onDownPress: () => void;
    onDeletePress: () => void;
}

const TrackListItemWrapper: React.FC<TrackListItemWrapperProps> = ({
    playlistRef,
    shouldFreezeUi,
    id,
    onUpPress,
    onDownPress,
    onDeletePress,
}) => {
    const canMoveUp = useSelector(playlistRef, (state) =>
        state.can({
            type: 'CHANGE_TRACK_ORDER_UP',
            trackID: id,
        }),
    );
    const canMoveDown = useSelector(playlistRef, (state) =>
        state.can({
            type: 'CHANGE_TRACK_ORDER_DOWN',
            trackID: id,
        }),
    );

    return (
        <TrackListItemActions
            disabled={shouldFreezeUi}
            disabledMoveUp={canMoveUp === false}
            disabledMoveDown={canMoveDown === false}
            onUpPress={onUpPress}
            onDownPress={onDownPress}
            onDeletePress={onDeletePress}
        />
    );
};

const MusicPlaylistEditorRoomScreen: React.FC<MusicPlaylistEditorRoomScreenProps> =
    ({ navigation, playlist, playlist: { id: playlistID } }) => {
        const insets = useSafeAreaInsets();
        const playlistRef = playlist.ref;
        const roomName = useSelector(
            playlistRef,
            (state) => state.context.state.name,
        );
        const playlistTotalDuration = useSelector(
            playlistRef,
            (state) => state.context.state.playlistTotalDuration,
        );
        const tracks = useSelector(
            playlistRef,
            (state) => state.context.state.tracks,
        );
        const shouldFreezeUi = useSelector(playlistRef, (state) =>
            state.hasTag('freezeUi'),
        );

        function handleAddTrack() {
            navigation.navigate('SearchTracks', {
                id: playlistID,
            });
        }

        function handleUpPress(trackID: string) {
            return () => {
                playlistRef.send({
                    type: 'CHANGE_TRACK_ORDER_UP',
                    trackID,
                });
            };
        }

        function handleDownPress(trackID: string) {
            return () => {
                playlistRef.send({
                    type: 'CHANGE_TRACK_ORDER_DOWN',
                    trackID,
                });
            };
        }

        function handleDeletePress(trackID: string) {
            return () => {
                playlistRef.send({
                    type: 'DELETE_TRACK',
                    trackID,
                });
            };
        }

        return (
            <AppScreen>
                <AppScreenHeader
                    title={`Playlist ${playlist.roomName}`}
                    insetTop={insets.top}
                />

                <AppScreenContainer>
                    <MotiView
                        animate={{
                            opacity: shouldFreezeUi === true ? 0.4 : 1,
                        }}
                        style={{ flex: 1 }}
                    >
                        <Typo>{playlistTotalDuration} NOT FORMATED</Typo>
                        <Typo>{tracks.length} Tracks</Typo>

                        <FlatList
                            data={tracks}
                            ListHeaderComponent={() => {
                                return (
                                    <AddTrackButton
                                        disabled={shouldFreezeUi}
                                        onPress={handleAddTrack}
                                    />
                                );
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
                                            Actions={() => {
                                                return (
                                                    <TrackListItemWrapper
                                                        playlistRef={
                                                            playlistRef
                                                        }
                                                        shouldFreezeUi={
                                                            shouldFreezeUi
                                                        }
                                                        id={id}
                                                        onUpPress={handleUpPress(
                                                            id,
                                                        )}
                                                        onDownPress={handleDownPress(
                                                            id,
                                                        )}
                                                        onDeletePress={handleDeletePress(
                                                            id,
                                                        )}
                                                    />
                                                );
                                            }}
                                        />
                                    </View>
                                );
                            }}
                        />
                    </MotiView>
                </AppScreenContainer>
            </AppScreen>
        );
    };

const MusicPlaylistEditorRoomWrapper: React.FC<MpeTabMpeRoomScreenProps> = (
    props,
) => {
    const playlistID = props.route.params.id;
    const playlist = usePlaylist(playlistID);

    return <MusicPlaylistEditorRoomScreen {...props} playlist={playlist} />;
};

export default MusicPlaylistEditorRoomWrapper;
