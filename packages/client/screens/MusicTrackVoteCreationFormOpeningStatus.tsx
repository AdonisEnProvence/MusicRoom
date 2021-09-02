import { Ionicons } from '@expo/vector-icons';
import { useActor } from '@xstate/react';
import { Text, View, useSx } from 'dripsy';
import React from 'react';
import { Switch, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen, AppScreenContainer } from '../components/kit';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { MusicTrackVoteCreationFormOpeningStatusScreenProps } from '../types';

const MusicTrackVoteCreationFormOpeningStatus: React.FC<MusicTrackVoteCreationFormOpeningStatusScreenProps> =
    () => {
        const insets = useSafeAreaInsets();
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();
        const [state, send] = useActor(mtvRoomCreationActor);
        const sx = useSx();

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

        function handleNext() {
            send({
                type: 'NEXT',
            });
        }

        return (
            <AppScreen>
                <AppScreenContainer>
                    <View
                        sx={{
                            flex: 1,
                            paddingTop: insets.top,
                            paddingBottom: insets.bottom,
                            paddingLeft: 'l',
                            paddingRight: 'l',

                            justifyContent: 'space-between',
                        }}
                    >
                        <View sx={{ marginTop: 'xl' }}>
                            <Text
                                sx={{
                                    paddingLeft: 'l',
                                    paddingRight: 'l',

                                    color: 'white',
                                    fontSize: 'l',
                                    textAlign: 'center',
                                }}
                            >
                                What is the opening status of the room ?
                            </Text>

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
                                            index <
                                            openingStatusButtons.length - 1;

                                        return (
                                            <TouchableOpacity
                                                key={text}
                                                style={sx({
                                                    width: 110,
                                                    height: 100,
                                                    borderRadius: 's',
                                                    padding: 'l',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    backgroundColor:
                                                        'greyLighter',

                                                    marginRight: isNotLastButton
                                                        ? 'l'
                                                        : undefined,
                                                })}
                                                accessibilityState={{
                                                    selected,
                                                }}
                                                onPress={onPress}
                                            >
                                                {selected && (
                                                    <View
                                                        sx={{
                                                            position:
                                                                'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            marginTop: -8,
                                                            marginLeft: -8,
                                                            backgroundColor:
                                                                'secondary',
                                                            borderRadius:
                                                                'full',

                                                            // Copy-pasted from https://ethercreative.github.io/react-native-shadow-generator/
                                                            shadowColor: '#000',
                                                            shadowOffset: {
                                                                width: 0,
                                                                height: 1,
                                                            },
                                                            shadowOpacity: 0.2,
                                                            shadowRadius: 1.41,

                                                            elevation: 2,
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={24}
                                                            style={sx({})}
                                                        />
                                                    </View>
                                                )}

                                                <Text sx={{ color: 'white' }}>
                                                    {text}
                                                </Text>
                                            </TouchableOpacity>
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
                        </View>

                        <View sx={{ marginBottom: 'xl', flexDirection: 'row' }}>
                            <TouchableOpacity
                                style={sx({
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderColor: 'greyLighter',
                                    borderWidth: 1,
                                    paddingLeft: 'm',
                                    paddingRight: 'm',
                                    paddingTop: 'm',
                                    paddingBottom: 'm',
                                    borderRadius: 's',
                                    marginRight: 'l',
                                })}
                                onPress={handleGoBack}
                            >
                                <Text sx={{ color: 'white', fontSize: 's' }}>
                                    Back
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={sx({
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderColor: 'greyLighter',
                                    borderWidth: 1,
                                    paddingLeft: 'm',
                                    paddingRight: 'm',
                                    paddingTop: 'm',
                                    paddingBottom: 'm',
                                    borderRadius: 's',
                                })}
                                onPress={handleNext}
                            >
                                <Text sx={{ color: 'white', fontSize: 's' }}>
                                    Next
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </AppScreenContainer>
            </AppScreen>
        );
    };

export default MusicTrackVoteCreationFormOpeningStatus;
