import { useActor } from '@xstate/react';
import React from 'react';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { MusicTrackVoteCreationFormPhysicalConstraintsScreenProps } from '../types';

const MusicTrackVoteCreationFormPhysicalConstraints: React.FC<MusicTrackVoteCreationFormPhysicalConstraintsScreenProps> =
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
                title="Do you want to restrict voting right to physical contraints?"
                onBackButtonPress={handleGoBack}
                onNextButtonPress={handleGoNext}
                Content={() => null}
            />
        );
    };

export default MusicTrackVoteCreationFormPhysicalConstraints;
