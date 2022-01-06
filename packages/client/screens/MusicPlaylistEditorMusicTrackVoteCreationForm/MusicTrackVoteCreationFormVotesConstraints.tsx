import React from 'react';
import { useExportToMtvRoomCreationFormMachine } from '../../hooks/useMusicPlaylistsActor';
import { MusicTrackVoteCreationFormVotesConstraints } from '../MusicTrackVoteCreationFormVotesConstraints';
import { MusicTrackVoteCreationFormVotesConstraintsScreenProps } from '../../types';

const MusicTrackVoteCreationFormVotesConstraintsWrapper: React.FC<MusicTrackVoteCreationFormVotesConstraintsScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useExportToMtvRoomCreationFormMachine();

        if (mtvRoomCreationActor === undefined) {
            return null;
        }

        return (
            <MusicTrackVoteCreationFormVotesConstraints
                {...props}
                mtvRoomCreationActor={mtvRoomCreationActor}
            />
        );
    };

export default MusicTrackVoteCreationFormVotesConstraintsWrapper;
