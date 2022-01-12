import { Ionicons } from '@expo/vector-icons';
import { useActor, useMachine } from '@xstate/react';
import { useSx, View } from 'dripsy';
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Typo } from '../components/kit';
import { usePlaylist } from '../hooks/useMusicPlaylistsActor';
import { MusicPlaylistEditorUsersSearchModalProps } from '../types';
import UsersSearchEngineScreen from './UsersSearchEngineScreen';

const MusicPlaylistEditorUsersSearchModal: React.FC<MusicPlaylistEditorUsersSearchModalProps> =
    ({ navigation, route }) => {
        const roomID = route.params.roomID;
        const sx = useSx();
        const playlistRef = usePlaylist(roomID);

        function handleGoBack() {
            navigation.goBack();
        }

        if (playlistRef === undefined) {
            return (
                <View>
                    <Typo>Could not find any related playlist</Typo>
                    <TouchableOpacity
                        onPress={handleGoBack}
                        style={sx({
                            borderRadius: 'full',
                            borderWidth: 2,
                            borderColor: 'secondary',
                            paddingX: 'l',
                            paddingY: 's',
                        })}
                    >
                        <Typo>Go back</Typo>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <UsersSearchEngineScreen
                onUserCardPress={(userID) =>
                    playlistRef.ref.send({
                        type: 'CREATOR_INVITE_USER',
                        userID,
                    })
                }
            />
        );
    };

export default MusicPlaylistEditorUsersSearchModal;
