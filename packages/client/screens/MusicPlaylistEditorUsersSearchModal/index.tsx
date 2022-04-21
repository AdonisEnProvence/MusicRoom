import React from 'react';
import { usePlaylist } from '../../hooks/useMusicPlaylistsActor';
import { MusicPlaylistEditorUsersSearchModalProps } from '../../types';
import ErrorScreen from '../kit/ErrorScreen';
import UsersSearchEngineScreen from '../UsersSearchEngineScreen';

const MusicPlaylistEditorUsersSearchModal: React.FC<MusicPlaylistEditorUsersSearchModalProps> =
    ({ route }) => {
        const roomID = route.params.roomID;
        const playlistRef = usePlaylist(roomID);

        if (playlistRef === undefined) {
            return (
                <ErrorScreen
                    title="Users search"
                    message="Could not find any related playlist"
                />
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
