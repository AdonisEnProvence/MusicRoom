import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from '@xstate/react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useSx, Text, View } from 'dripsy';
import { View as MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '@motify/skeleton';
import { useFocusEffect } from '@react-navigation/native';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    Typo,
} from '../../components/kit';
import { MpeTabMpeRoomScreenProps } from '../../types';
import { usePlaylist } from '../../hooks/useMusicPlaylistsActor';
import { MusicPlaylist } from '../../machines/appMusicPlaylistsModel';
import TrackListItem from '../../components/Track/TrackListItem';
import { PlaylistActorRef } from '../../machines/playlistMachine';
import BottomRightAbsoluteButton from '../../components/kit/BottomRightAbsoluteButton';
import { InviteUserButton } from '../MusicTrackVoteUsersListModal';

interface MusicPlaylistEditorRoomScreenProps extends MpeTabMpeRoomScreenProps {
    playlist: MusicPlaylist;
}

interface AddTrackButtonProps {
    disabled: boolean;
    onPress: () => void;
}

//Should we be using date-fns ?
//copy pasted from https://stackoverflow.com/questions/19700283/how-to-convert-time-in-milliseconds-to-hours-min-sec-format-in-javascript
export function msToTime(ms: number): string {
    const seconds = ms / 1000;
    const minutes = ms / (1000 * 60);
    const hours = ms / (1000 * 60 * 60);
    const days = ms / (1000 * 60 * 60 * 24);
    if (seconds < 60) return seconds.toFixed(1) + ' Sec';
    else if (minutes < 60) return minutes.toFixed(1) + ' Min';
    else if (hours < 24) return hours.toFixed(1) + ' Hrs';
    else return days.toFixed(1) + ' Days';
}

const AddTrackButton: React.FC<AddTrackButtonProps> = ({
    disabled,
    onPress,
}) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            testID="mpe-add-track-button"
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
    disabled: boolean;
    id: string;
    onUpPress: () => void;
    onDownPress: () => void;
    onDeletePress: () => void;
}

const TrackListItemWrapper: React.FC<TrackListItemWrapperProps> = ({
    playlistRef,
    disabled,
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
            disabled={disabled}
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
        const sx = useSx();
        const insets = useSafeAreaInsets();
        const playlistRef = playlist.ref;
        const userIsNotInRoom = useSelector(
            playlistRef,
            (state) => state.context.userIsNotInRoom,
        );
        const playlistTotalDuration = useSelector(
            playlistRef,
            (state) => state.context.state.playlistTotalDuration,
        );
        const usersLength = useSelector(
            playlistRef,
            (state) => state.context.state.usersLength,
        );
        const tracks = useSelector(
            playlistRef,
            (state) => state.context.state.tracks,
        );
        const shouldFreezeUi = useSelector(playlistRef, (state) =>
            state.hasTag('freezeUi'),
        );
        const roomID = useSelector(
            playlistRef,
            (state) => state.context.state.roomID,
        );
        const roomIsNotReady = useSelector(playlistRef, (state) =>
            state.hasTag('roomIsNotReady'),
        );
        const userRelatedInformation = useSelector(
            playlistRef,
            (state) => state.context.state.userRelatedInformation,
        );
        const roomCreatorUserID = useSelector(
            playlistRef,
            (state) => state.context.state.roomCreatorUserID,
        );
        const isOpenOnlyInvitedUsersCanEdit = useSelector(
            playlistRef,
            (state) => state.context.state.isOpenOnlyInvitedUsersCanEdit,
        );
        const isOpen = useSelector(
            playlistRef,
            (state) => state.context.state.isOpen,
        );

        const userIsInvited =
            userRelatedInformation !== null &&
            userRelatedInformation.userHasBeenInvited;
        const roomIsOpenAndOnlyInvitedUsersCanEdit =
            isOpen && isOpenOnlyInvitedUsersCanEdit;
        const userIsNotInvitedAndRoomIsInOpenOnlyInvitedUsersCanEdit =
            roomIsOpenAndOnlyInvitedUsersCanEdit && !userIsInvited;

        console.log(userIsNotInRoom, shouldFreezeUi);
        //Interface disabling variables
        const disableEveryCta = userIsNotInRoom || shouldFreezeUi;

        //Both leave and export mpe as mtv are not playlist edit operation
        const disableEveryPlaylistEditOperationCta =
            disableEveryCta ||
            userIsNotInvitedAndRoomIsInOpenOnlyInvitedUsersCanEdit;

        //Hide or not invite user button
        const userIsMpeRoomCreator =
            userRelatedInformation !== null &&
            userRelatedInformation.userID === roomCreatorUserID;
        ///

        console.log({ disableEveryPlaylistEditOperationCta, disableEveryCta });

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

        function handleJoinPress() {
            playlistRef.send({
                type: 'JOIN_ROOM',
            });
        }

        function handleLeavePress() {
            playlistRef.send({
                type: 'LEAVE_ROOM',
            });
        }

        function handleExportToMtvPress() {
            playlistRef.send({
                type: 'EXPORT_TO_MTV',
            });
        }

        function handleInviteUserButtonPressed() {
            console.log('invitation pressed');
            navigation.navigate('MusicPlaylistEditorUsersSearch', {
                screen: 'MusicPlaylistEditorUsersSearchModal',
                params: {
                    roomID,
                },
            });
        }

        useFocusEffect(
            React.useCallback(() => {
                // Do something when the screen is focused
                playlistRef.send({
                    type: 'MPE_ROOM_VIEW_FOCUS',
                });

                return () => {
                    // Do something when the screen is unfocused
                    // Useful for cleanup functions
                    playlistRef.send({
                        type: 'MPE_ROOM_VIEW_BLUR',
                    });
                };
            }, [playlistRef]),
        );

        return (
            <AppScreen testID={`mpe-room-screen-${playlistID}`}>
                <AppScreenHeader
                    title={`Playlist ${playlist.roomName}`}
                    insetTop={insets.top}
                    canGoBack
                    goBack={() => {
                        navigation.goBack();
                    }}
                    HeaderRight={
                        userIsMpeRoomCreator
                            ? () => (
                                  <InviteUserButton
                                      testID={'mpe-invite-user-button'}
                                      onInviteUser={
                                          handleInviteUserButtonPressed
                                      }
                                  />
                              )
                            : undefined
                    }
                />

                <AppScreenContainer>
                    <MotiView
                        animate={{
                            opacity: shouldFreezeUi === true ? 0.4 : 1,
                        }}
                        style={{ flex: 1 }}
                    >
                        <Skeleton
                            show={roomIsNotReady}
                            colorMode="dark"
                            width="100%"
                        >
                            <Typo>{msToTime(playlistTotalDuration)}</Typo>
                        </Skeleton>

                        <Typo>{`${usersLength} member${
                            usersLength > 1 ? 's' : ''
                        }`}</Typo>

                        <TouchableOpacity
                            disabled={disableEveryCta}
                            style={sx({
                                flexShrink: 0,
                                backgroundColor: 'greyLight',
                                padding: 'm',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                marginBottom: 'l',
                            })}
                            onPress={handleLeavePress}
                        >
                            <Text
                                sx={{
                                    color: 'white',
                                    textAlign: 'center',
                                    fontSize: 'm',
                                }}
                            >
                                Leave room
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            disabled={disableEveryCta}
                            style={sx({
                                flexShrink: 0,
                                backgroundColor: 'greyLight',
                                padding: 'm',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                marginBottom: 'l',
                            })}
                            onPress={handleExportToMtvPress}
                        >
                            <Text
                                sx={{
                                    color: 'white',
                                    textAlign: 'center',
                                    fontSize: 'm',
                                }}
                            >
                                Export to MTV
                            </Text>
                        </TouchableOpacity>

                        <Skeleton
                            show={roomIsNotReady}
                            colorMode="dark"
                            width="100%"
                        >
                            <Typo>{tracks.length} Tracks</Typo>
                        </Skeleton>

                        {userIsNotInRoom === true && (
                            <BottomRightAbsoluteButton
                                testID={`mpe-join-${roomID}`}
                                onPress={handleJoinPress}
                                Icon={() => <Typo>JOIN</Typo>}
                            />
                        )}

                        <FlatList
                            data={tracks}
                            ListHeaderComponent={() => {
                                return (
                                    <AddTrackButton
                                        disabled={
                                            disableEveryPlaylistEditOperationCta
                                        }
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
                                    <Skeleton
                                        show={roomIsNotReady}
                                        colorMode="dark"
                                        width="100%"
                                    >
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
                                                            disabled={
                                                                disableEveryPlaylistEditOperationCta
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
                                    </Skeleton>
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
    const insets = useSafeAreaInsets();

    if (playlist === undefined) {
        return (
            <AppScreen>
                <AppScreenHeader
                    title={`Playlist is loading`}
                    insetTop={insets.top}
                    canGoBack
                    goBack={() => {
                        props.navigation.goBack();
                    }}
                />

                <AppScreenContainer>
                    <MotiView
                        animate={{
                            opacity: 0.4,
                        }}
                        style={{ flex: 1 }}
                    >
                        <Skeleton show={true} colorMode="dark" width="100%" />

                        <Skeleton show={true} colorMode="dark" width="100%" />
                    </MotiView>
                </AppScreenContainer>
            </AppScreen>
        );
    }

    return <MusicPlaylistEditorRoomScreen {...props} playlist={playlist} />;
};

export default MusicPlaylistEditorRoomWrapper;
