import { useActor } from '@xstate/react';
import React from 'react';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { MusicTrackVoteCreationFormConfirmationScreenProps } from '../types';

const MusicTrackVoteCreationFormConfirmation: React.FC<MusicTrackVoteCreationFormConfirmationScreenProps> =
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
                title="Confirm room creation"
                onBackButtonPress={handleGoBack}
                onNextButtonPress={handleGoNext}
                Content={null}
            />
        );
    };

export default MusicTrackVoteCreationFormConfirmation;
