import React from 'react';
import { AppScreen } from '../../components/kit';
import { useExportToMtvRoomCreationFormMachine } from '../../hooks/useMusicPlaylistsActor';
import { MusicTrackVoteCreationFormNameScreenProps } from '../../types';
import { MusicTrackVoteCreationFormName } from '../MusicTrackVoteCreationFormName';

const MusicTrackVoteCreationFormNameWrapper: React.FC<MusicTrackVoteCreationFormNameScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useExportToMtvRoomCreationFormMachine();

        if (mtvRoomCreationActor === undefined) {
            return (
                <AppScreen testID="music-track-vote-creation-form-name-screen-default" />
            );
        }

        return (
            <MusicTrackVoteCreationFormName
                {...props}
                mtvRoomCreationActor={mtvRoomCreationActor}
            />
        );
    };

export default MusicTrackVoteCreationFormNameWrapper;
