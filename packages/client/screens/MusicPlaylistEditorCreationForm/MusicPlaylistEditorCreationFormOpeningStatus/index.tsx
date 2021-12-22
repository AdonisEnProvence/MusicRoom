import { useSelector } from '@xstate/react';
import { Text, View } from 'dripsy';
import React from 'react';
import { Switch } from 'react-native';
import MtvRoomCreationFormScreen from '../../../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import MtvRoomCreationFormOptionButton from '../../../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import { useMpeRoomCreationFormActor } from '../../../hooks/useMusicPlaylistsActor';
import { CreationMpeRoomFormActorRef } from '../../../machines/creationMpeRoomForm';

interface MusicPlaylistEditorCreationFormOpeningStatusProps {
    creationFormActor: CreationMpeRoomFormActorRef;
}

const MusicPlaylistEditorCreationFormOpeningStatus: React.FC<MusicPlaylistEditorCreationFormOpeningStatusProps> =
    ({ creationFormActor }) => {
        const isRoomPublic = useSelector(creationFormActor, (state) =>
            state.hasTag('isRoomPublic'),
        );
        const isRoomPrivate = useSelector(creationFormActor, (state) =>
            state.hasTag('isRoomPrivate'),
        );
        const onlyInvitedUsersCanVote = useSelector(
            creationFormActor,
            (state) => state.context.onlyInvitedUsersCanVote,
        );
        const openingStatusButtons = [
            {
                text: 'Public',
                selected: isRoomPublic,
                onPress: setOpeningStatus(true),
            },

            {
                text: 'Private',
                selected: isRoomPrivate,
                onPress: setOpeningStatus(false),
            },
        ];

        function setOpeningStatus(isOpen: boolean) {
            return () => {
                creationFormActor.send({
                    type: 'SET_OPENING_STATUS',
                    isOpen,
                });
            };
        }

        function handleOnlyInvitedUsersVotingRestriction(
            shouldRestrictVoting: boolean,
        ) {
            creationFormActor.send({
                type: 'SET_INVITED_USERS_VOTE_RESTRICTION',
                onlyInvitedUsersCanVote: shouldRestrictVoting,
            });
        }

        function handleGoBack() {
            creationFormActor.send({
                type: 'GO_BACK',
            });
        }

        function handleGoNext() {
            creationFormActor.send({
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
                                            shouldApplyRightMargin={
                                                isNotLastButton
                                            }
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

const MusicPlaylistEditorCreationFormOpeningStatusWrapper: React.FC = () => {
    const creationFormActor = useMpeRoomCreationFormActor();

    if (creationFormActor === undefined) {
        return null;
    }

    return (
        <MusicPlaylistEditorCreationFormOpeningStatus
            creationFormActor={creationFormActor}
        />
    );
};

export default MusicPlaylistEditorCreationFormOpeningStatusWrapper;
