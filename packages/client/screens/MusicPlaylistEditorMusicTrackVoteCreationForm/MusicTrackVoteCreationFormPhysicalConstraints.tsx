import React from 'react';
import { useExportToMtvRoomCreationFormMachine } from '../../hooks/useMusicPlaylistsActor';
import { MusicTrackVoteCreationFormPhysicalConstraints } from '../MusicTrackVoteCreationFormPhysicalConstraints';
import { MusicTrackVoteCreationFormPhysicalConstraintsScreenProps } from '../../types';

const MusicTrackVoteCreationFormPhysicalConstraintsWrapper: React.FC<MusicTrackVoteCreationFormPhysicalConstraintsScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useExportToMtvRoomCreationFormMachine();

        if (mtvRoomCreationActor === undefined) {
            return null;
        }

        return (
            <MusicTrackVoteCreationFormPhysicalConstraints
                {...props}
                mtvRoomCreationActor={mtvRoomCreationActor}
            />
        );
    };

export default MusicTrackVoteCreationFormPhysicalConstraintsWrapper;
