import React from 'react';
import { useExportToMtvRoomCreationFormMachine } from '../../hooks/useMusicPlaylistsActor';
import { MusicTrackVoteCreationFormOpeningStatus } from '../MusicTrackVoteCreationFormOpeningStatus';
import { MusicTrackVoteCreationFormOpeningStatusScreenProps } from '../../types';

const MusicTrackVoteCreationFormOpeningStatusWrapper: React.FC<MusicTrackVoteCreationFormOpeningStatusScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useExportToMtvRoomCreationFormMachine();

        if (mtvRoomCreationActor === undefined) {
            return null;
        }

        return (
            <MusicTrackVoteCreationFormOpeningStatus
                {...props}
                mtvRoomCreationActor={mtvRoomCreationActor}
            />
        );
    };

export default MusicTrackVoteCreationFormOpeningStatusWrapper;
