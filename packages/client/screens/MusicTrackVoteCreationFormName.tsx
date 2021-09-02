import { Text, View, useSx, TextInput } from 'dripsy';
import React from 'react';
import { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen, AppScreenContainer } from '../components/kit';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { MusicTrackVoteCreationFormNameScreenProps } from '../types';

const MusicTrackVoteCreationFormName: React.FC<MusicTrackVoteCreationFormNameScreenProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();
        const sx = useSx();

        useEffect(() => {
            function closeModal() {
                navigation.popToTop();
                navigation.goBack();
            }

            mtvRoomCreationActor?.send({
                type: 'FORWARD_MODAL_CLOSER',
                closeModal,
            });
        }, [mtvRoomCreationActor, navigation]);

        function handleGoBack() {
            mtvRoomCreationActor?.send({
                type: 'GO_BACK',
            });
        }

        function handleContinue() {
            mtvRoomCreationActor?.send({
                type: 'SAVE_ROOM_NAME',
                roomName: 'ROOM NAME',
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
                                What is the name of the room?
                            </Text>

                            <View sx={{ marginTop: 'xl' }}>
                                <TextInput
                                    placeholder="Francis Cabrel OnlyFans"
                                    sx={{
                                        borderWidth: 1,
                                        borderColor: 'white',
                                        padding: 'm',
                                        fontSize: 's',
                                        color: 'white',
                                        borderRadius: 's',
                                    }}
                                />
                            </View>

                            <View
                                sx={{
                                    marginTop: 'xl',
                                    backgroundColor: 'greyLighter',
                                    color: 'greyLight',
                                    padding: 'm',
                                    borderRadius: 's',
                                }}
                            >
                                <Text>This is an advice</Text>
                            </View>
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
                                onPress={handleContinue}
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

export default MusicTrackVoteCreationFormName;
