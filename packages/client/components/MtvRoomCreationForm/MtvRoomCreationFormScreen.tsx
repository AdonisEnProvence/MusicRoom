import React from 'react';
import { Text, View, useSx } from 'dripsy';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen, AppScreenContainer } from '../kit';

interface MtvRoomCreationFormScreenProps {
    title: string;
    backButtonText?: string;
    onBackButtonPress: () => void;
    nextButtonText?: string;
    onNextButtonPress: () => void;
    Content: React.ReactElement | null;
    testID?: string;
}

const MtvRoomCreationFormScreen: React.FC<MtvRoomCreationFormScreenProps> = ({
    title,
    backButtonText,
    onBackButtonPress,
    nextButtonText,
    onNextButtonPress,
    Content,
    testID,
}) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();

    return (
        <AppScreen>
            <AppScreenContainer>
                <View testID={testID} sx={{ flexDirection: 'row', flex: 1 }}>
                    <View
                        sx={{
                            flex: 1,
                            paddingTop: insets.top,
                            paddingBottom: insets.bottom,
                            paddingLeft: 'l',
                            paddingRight: 'l',
                            maxWidth: [null, 420, 720],
                            marginLeft: 'auto',
                            marginRight: 'auto',

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
                                {title}
                            </Text>

                            {Content}
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
                                onPress={onBackButtonPress}
                            >
                                <Text sx={{ color: 'white', fontSize: 's' }}>
                                    {backButtonText ?? 'Back'}
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
                                onPress={onNextButtonPress}
                            >
                                <Text sx={{ color: 'white', fontSize: 's' }}>
                                    {nextButtonText ?? 'Next'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MtvRoomCreationFormScreen;
