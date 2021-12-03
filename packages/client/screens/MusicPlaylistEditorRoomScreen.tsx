import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from '@xstate/react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useSx, Text, View } from 'dripsy';
import { View as MotiView } from 'moti';
import { datatype, name } from 'faker';
import { Ionicons } from '@expo/vector-icons';
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

interface TrackItemActionsProps {
    disabled: boolean;
    onUpPress: () => void;
    onDownPress: () => void;
    onDotsPress: () => void;
}

const TrackItemActions = ({
    disabled,
    onUpPress,
    onDownPress,
    onDotsPress,
}: TrackItemActionsProps) => {
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
                    disabled={disabled}
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
                    disabled={disabled}
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
                disabled={disabled}
                style={sx({
                    padding: 's',
                })}
                onPress={onDotsPress}
            >
                <Ionicons name="ellipsis-horizontal" color="white" size={18} />
            </TouchableOpacity>
        </View>
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
        const shouldFreezeUi = useSelector(playlistRef, (state) =>
            state.hasTag('freezeUi'),
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

        function handleUpPress(trackID: string) {
            return () => {
                return undefined;
            };
        }

        function handleDownPress(trackID: string) {
            return () => {
                return undefined;
            };
        }

        function handleDotsPress(trackID: string) {
            return () => {
                return undefined;
            };
        }

        return (
            <AppScreen>
                <AppScreenHeader
                    title={`Playlist ${playlist.id}`}
                    insetTop={insets.top}
                />

                <AppScreenContainer>
                    <MotiView
                        animate={{
                            opacity: shouldFreezeUi === true ? 0.4 : 1,
                        }}
                        style={{ flex: 1 }}
                    >
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
                                                    <TrackItemActions
                                                        disabled={
                                                            shouldFreezeUi
                                                        }
                                                        onUpPress={handleUpPress(
                                                            id,
                                                        )}
                                                        onDownPress={handleDownPress(
                                                            id,
                                                        )}
                                                        onDotsPress={handleDotsPress(
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
