import React from 'react';
import { useMusicPlayerSend } from '../hooks/musicPlayerHooks';
import { MusicPlaylistEditorUsersSearchModalProps } from '../types';
import UsersSearchEngineScreen from './UsersSearchEngineScreen';

const MusicPlaylistEditorUsersSearchModal: React.FC<MusicPlaylistEditorUsersSearchModalProps> =
    () => {
        const sendToMusicPlayer = useMusicPlayerSend();

        return (
            <UsersSearchEngineScreen
                onUserCardPress={(userID) =>
                    sendToMusicPlayer({
                        type: 'CREATOR_INVITE_USER',
                        invitedUserID: userID,
                    })
                }
            />
        );
    };

export default MusicPlaylistEditorUsersSearchModal;
