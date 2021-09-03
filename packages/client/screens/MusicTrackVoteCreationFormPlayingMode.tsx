import { useActor } from '@xstate/react';
import React from 'react';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { MusicTrackVoteCreationFormPlayingModeScreenProps } from '../types';

const MusicTrackVoteCreationFormPlayingMode: React.FC<MusicTrackVoteCreationFormPlayingModeScreenProps> =
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
                title="Which playing mode do you want?"
                onBackButtonPress={handleGoBack}
                onNextButtonPress={handleGoNext}
                Content={null}
            />
        );
    };

export default MusicTrackVoteCreationFormPlayingMode;
