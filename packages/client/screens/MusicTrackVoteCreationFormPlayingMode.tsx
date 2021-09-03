import { useActor } from '@xstate/react';
import { View } from 'dripsy';
import React from 'react';
import MtvRoomCreationFormOptionButton from '../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { MtvRoomPlayingMode } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormPlayingModeScreenProps } from '../types';

const MusicTrackVoteCreationFormPlayingMode: React.FC<MusicTrackVoteCreationFormPlayingModeScreenProps> =
    () => {
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();
        const [state, send] = useActor(mtvRoomCreationActor);
        const currentPlayingMode = state.context.playingMode;

        const playingModeOptions = [
            {
                text: 'Broadcast',
                selected: currentPlayingMode === 'BROADCAST',
                onPress: handleSetPlayingMode('BROADCAST'),
            },

            {
                text: 'Direct',
                selected: currentPlayingMode === 'DIRECT',
                onPress: handleSetPlayingMode('DIRECT'),
            },
        ];

        function handleSetPlayingMode(playingMode: MtvRoomPlayingMode) {
            return () => {
                send({
                    type: 'SET_PLAYING_MODE',
                    playingMode,
                });
            };
        }

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
                title="Which playing mode do you want?"
                onBackButtonPress={handleGoBack}
                onNextButtonPress={handleGoNext}
                Content={
                    <View
                        sx={{
                            marginTop: 'xl',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        {playingModeOptions.map(
                            ({ text, selected, onPress }, index) => {
                                const isNotLastButton =
                                    index < playingModeOptions.length - 1;

                                return (
                                    <MtvRoomCreationFormOptionButton
                                        key={text}
                                        text={text}
                                        isSelected={selected}
                                        onPress={onPress}
                                        shouldApplyRightMargin={isNotLastButton}
                                    />
                                );
                            },
                        )}
                    </View>
                }
            />
        );
    };

export default MusicTrackVoteCreationFormPlayingMode;
