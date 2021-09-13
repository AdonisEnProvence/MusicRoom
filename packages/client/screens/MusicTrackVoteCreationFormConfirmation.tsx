import { Text, View } from '@dripsy/core';
import { useActor } from '@xstate/react';
import React from 'react';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { formatDateTime } from '../hooks/useFormatDateTime';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormConfirmationScreenProps } from '../types';

const MusicTrackVoteCreationFormConfirmation: React.FC<
    MusicTrackVoteCreationFormConfirmationScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ mtvRoomCreationActor }) => {
    const [state, send] = useActor(mtvRoomCreationActor);

    const summarySections = [
        {
            title: 'Name of the room',
            value: state.context.roomName,
        },

        {
            title: 'Opening status of the room',
            value: state.context.isOpen === true ? 'Public' : 'Private',
        },
        ...(state.context.isOpen === true
            ? [
                  {
                      title: 'Can only invited users vote?',
                      value:
                          state.context.onlyInvitedUsersCanVote === true
                              ? 'Yes'
                              : 'No',
                  },
              ]
            : []),

        {
            title: 'Has physical constraints?',
            value: state.context.hasPhysicalConstraints === true ? 'Yes' : 'No',
        },
        ...(state.context.hasPhysicalConstraints === true
            ? [
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
                      value: formatDateTime(
                          state.context.physicalConstraintStartsAt,
                      ),
                  },

                  {
                      title: 'Ends at',
                      value: formatDateTime(
                          state.context.physicalConstraintEndsAt,
                      ),
                  },
              ]
            : []),

        {
            title: 'Playing mode',
            value: state.context.playingMode,
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
            testID="mtv-room-creation-confirmation-step"
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
                                    marginBottom: 's',
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

const MusicTrackVoteCreationFormConfirmationWrapper: React.FC<MusicTrackVoteCreationFormConfirmationScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();

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
