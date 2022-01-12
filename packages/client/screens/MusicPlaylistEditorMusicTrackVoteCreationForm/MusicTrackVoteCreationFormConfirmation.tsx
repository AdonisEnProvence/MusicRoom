import React from 'react';
import { MusicTrackVoteCreationFormConfirmation } from '../MusicTrackVoteCreationFormConfirmation';
import { MusicTrackVoteCreationFormConfirmationScreenProps } from '../../types';
import { useExportToMtvRoomCreationFormMachine } from '../../hooks/useMusicPlaylistsActor';

const MusicTrackVoteCreationFormConfirmationWrapper: React.FC<MusicTrackVoteCreationFormConfirmationScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useExportToMtvRoomCreationFormMachine();

        if (mtvRoomCreationActor === undefined) {
            return null;
        }

        return (
            <MusicTrackVoteCreationFormConfirmation
                {...props}
                mtvRoomCreationActor={mtvRoomCreationActor}
            />
        );
    };

export default MusicTrackVoteCreationFormConfirmationWrapper;
