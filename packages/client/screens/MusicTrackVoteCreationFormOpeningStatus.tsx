import { useActor } from '@xstate/react';
import { Text, View } from 'dripsy';
import React from 'react';
import { Switch } from 'react-native';
import MtvRoomCreationFormOptionButton from '../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../hooks/musicPlayerHooks';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormOpeningStatusScreenProps } from '../types';

const MusicTrackVoteCreationFormOpeningStatus: React.FC<
    MusicTrackVoteCreationFormOpeningStatusScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ mtvRoomCreationActor }) => {
    const [state, send] = useActor(mtvRoomCreationActor);

    const isRoomPublic = state.hasTag('isRoomPublic');
    const onlyInvitedUsersCanVote = state.context.onlyInvitedUsersCanVote;
    const openingStatusButtons = [
        {
            text: 'Public',
            selected: isRoomPublic,
            onPress: setOpeningStatus(true),
        },

        {
            text: 'Private',
            selected: state.hasTag('isRoomPrivate'),
            onPress: setOpeningStatus(false),
        },
    ];

    function setOpeningStatus(isOpen: boolean) {
        return () => {
            send({
                type: 'SET_OPENING_STATUS',
                isOpen,
            });
        };
    }

    function handleOnlyInvitedUsersVotingRestriction(
        shouldRestrictVoting: boolean,
    ) {
        send({
            type: 'SET_INVITED_USERS_VOTE_RESTRICTION',
            onlyInvitedUsersCanVote: shouldRestrictVoting,
        });
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
            title="What is the opening status of the room?"
            onBackButtonPress={handleGoBack}
            onNextButtonPress={handleGoNext}
            Content={
                <>
                    <View
                        sx={{
                            marginTop: 'xl',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        {openingStatusButtons.map(
                            ({ text, selected, onPress }, index) => {
                                const isNotLastButton =
                                    index < openingStatusButtons.length - 1;

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

                    {isRoomPublic && (
                        <View
                            sx={{
                                paddingTop: 'xl',
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                sx={{
                                    marginRight: 'l',
                                    flex: 1,
                                    color: 'white',
                                }}
                            >
                                Allow only invited users to vote?
                            </Text>

                            <Switch
                                value={onlyInvitedUsersCanVote}
                                onValueChange={
                                    handleOnlyInvitedUsersVotingRestriction
                                }
                            />
                        </View>
                    )}
                </>
            }
        />
    );
};

const MusicTrackVoteCreationFormOpeningStatusWrapper: React.FC<MusicTrackVoteCreationFormOpeningStatusScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();

        if (mtvRoomCreationActor === undefined) {
            return null;
        }

        return (
            <MusicTrackVoteCreationFormOpeningStatus
                {...props}
                mtvRoomCreationActor={mtvRoomCreationActor}
            />
        );
    };

export default MusicTrackVoteCreationFormOpeningStatusWrapper;
