import { useActor } from '@xstate/react';
import React from 'react';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { MusicTrackVoteCreationFormVotesConstraintsScreenProps } from '../types';

const MusicTrackVoteCreationFormVotesConstraints: React.FC<MusicTrackVoteCreationFormVotesConstraintsScreenProps> =
    () => {
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();
        const [state, send] = useActor(mtvRoomCreationActor);

        function handleGoBack() {
            return undefined;
        }

        function handleGoNext() {
            return undefined;
        }

        return (
            <MtvRoomCreationFormScreen
                title="How many votes are required for a song to be played?"
                onBackButtonPress={handleGoBack}
                onNextButtonPress={handleGoNext}
                Content={null}
            />
        );
    };

export default MusicTrackVoteCreationFormVotesConstraints;
