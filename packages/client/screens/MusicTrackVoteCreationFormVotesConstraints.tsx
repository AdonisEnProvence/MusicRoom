import { useActor } from '@xstate/react';
import { View } from 'dripsy';
import React from 'react';
import MtvRoomCreationFormOptionButton from '../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../hooks/musicPlayerHooks';
import {
    CreationMtvRoomFormActorRef,
    MtvRoomMinimumVotesForATrackToBePlayed,
} from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormVotesConstraintsScreenProps } from '../types';

export const MusicTrackVoteCreationFormVotesConstraints: React.FC<
    MusicTrackVoteCreationFormVotesConstraintsScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ mtvRoomCreationActor }) => {
    const [state, send] = useActor(mtvRoomCreationActor);

    const minimumVotesForATrackToBePlayed =
        state.context.minimumVotesForATrackToBePlayed;
    const votesConstraintsButtons = [
        {
            text: '1',
            subtext: `Party at Kitty and Stud's`,
            selected: minimumVotesForATrackToBePlayed === 1,
            onPress: setVotesConstraints(1),
        },

        {
            text: '2',
            subtext: `Friendly online event`,
            selected: minimumVotesForATrackToBePlayed === 2,
            onPress: setVotesConstraints(2),
        },

        {
            text: '10',
            subtext: `Massive online event`,
            selected: minimumVotesForATrackToBePlayed === 10,
            onPress: setVotesConstraints(10),
        },
    ];

    function setVotesConstraints(
        minimumConstraint: MtvRoomMinimumVotesForATrackToBePlayed,
    ) {
        return () => {
            send({
                type: 'SET_MINIMUM_VOTES_FOR_A_TRACK_TO_BE_PLAYED',
                minimumVotesForATrackToBePlayed: minimumConstraint,
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
            title="How many votes are required for a song to be played?"
            onBackButtonPress={handleGoBack}
            onNextButtonPress={handleGoNext}
            Content={
                <>
                    <View
                        sx={{
                            marginTop: 'xl',
                            flexDirection: 'row',
                            justifyContent: 'space-around',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        {votesConstraintsButtons.map(
                            ({ text, subtext, selected, onPress }) => {
                                return (
                                    <View key={text} sx={{ padding: 'm' }}>
                                        <MtvRoomCreationFormOptionButton
                                            text={text}
                                            subtext={subtext}
                                            isSelected={selected}
                                            onPress={onPress}
                                            shouldApplyRightMargin={false}
                                        />
                                    </View>
                                );
                            },
                        )}
                    </View>
                </>
            }
        />
    );
};

const MusicTrackVoteCreationFormVotesConstraintsWrapper: React.FC<MusicTrackVoteCreationFormVotesConstraintsScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();

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
