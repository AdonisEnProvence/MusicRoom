import React from 'react';
import { useExportToMtvRoomCreationFormMachine } from '../../hooks/useMusicPlaylistsActor';
import { MusicTrackVoteCreationFormPlayingMode } from '../MusicTrackVoteCreationFormPlayingMode';
import { MusicTrackVoteCreationFormPlayingModeScreenProps } from '../../types';

const MusicTrackVoteCreationFormPlayingModeWrapper: React.FC<MusicTrackVoteCreationFormPlayingModeScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useExportToMtvRoomCreationFormMachine();

        if (mtvRoomCreationActor === undefined) {
            return null;
        }

        return (
            <MusicTrackVoteCreationFormPlayingMode
                {...props}
                mtvRoomCreationActor={mtvRoomCreationActor}
            />
        );
    };

export default MusicTrackVoteCreationFormPlayingModeWrapper;
