import { Text, View } from '@dripsy/core';
import { useActor } from '@xstate/react';
import React from 'react';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { MusicTrackVoteCreationFormConfirmationScreenProps } from '../types';

const MusicTrackVoteCreationFormConfirmation: React.FC<MusicTrackVoteCreationFormConfirmationScreenProps> =
    () => {
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();
        const [state, send] = useActor(mtvRoomCreationActor);

        const summarySections = [
            {
                title: 'Name of the room',
                value: state.context.roomName,
            },

            {
                title: 'Opening status of the room',
                value: state.context.isOpen ? 'Public' : 'Private',
            },

            {
                title: 'Geolocation',
                value: state.context.physicalConstraintPlace,
            },

            {
                title: 'Radius',
                value: state.context.physicalConstraintRadius,
            },

            {
                title: 'Starts at',
                value: state.context.physicalConstraintStartsAt,
            },

            {
                title: 'Ends at',
                value: state.context.physicalConstraintEndsAt,
            },

            {
                title: 'Minimum score',
                value: state.context.minimumVotesForATrackToBePlayed,
            },
        ];

        function handleGoBack() {
            send({
                type: 'GO_BACK',
            });
        }

        function handleGoNext() {
            send({
                type: 'NEXT',
            });
        }

        return (
            <MtvRoomCreationFormScreen
                title="Confirm room creation"
                onBackButtonPress={handleGoBack}
                onNextButtonPress={handleGoNext}
                Content={
                    <>
                        <View sx={{ marginTop: 'xl' }}>
                            {summarySections.map(({ title, value }) => (
                                <View
                                    key={title}
                                    sx={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Text sx={{ color: 'white' }}>{title}</Text>

                                    <Text sx={{ color: 'white' }}>{value}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                }
            />
        );
    };

export default MusicTrackVoteCreationFormConfirmation;
