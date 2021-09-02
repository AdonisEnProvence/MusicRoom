import { Text, View, useSx, TextInput } from 'dripsy';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { MusicTrackVoteCreationFormOpeningStatusScreenProps } from '../types';

const MusicTrackVoteCreationFormOpeningStatus: React.FC<MusicTrackVoteCreationFormOpeningStatusScreenProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();
        const sx = useSx();

        function handleGoBack() {
            mtvRoomCreationActor?.send({
                type: 'GO_BACK',
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
