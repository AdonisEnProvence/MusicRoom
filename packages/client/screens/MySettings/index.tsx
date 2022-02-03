import { useActor, useMachine } from '@xstate/react';
import { ScrollView, Text, View } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../../components/kit';
import MtvRoomCreationFormOptionButton from '../../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import { MySettingsScreenProps } from '../../types';
import {
    settingsMachine,
    VisibilitySettingMachineActor,
} from './settingsMachine';

interface VisibilitySettingProps {
    title: string;
    visibilitySettingActor: VisibilitySettingMachineActor;
}

const VisibilitySetting: React.FC<VisibilitySettingProps> = ({
    title,
    visibilitySettingActor,
}) => {
    const [state, send] = useActor(visibilitySettingActor);

    const options = [
        {
            text: 'Public',
            selected: state.hasTag('Public Visibility'),
            onPress: () => {
                send({
                    type: 'Update Visibility',
                    visibility: 'PUBLIC',
                });
            },
        },
        {
            text: 'Followers only',
            selected: state.hasTag('Followers Only Visibility'),
            onPress: () => {
                send({
                    type: 'Update Visibility',
                    visibility: 'FOLLOWERS_ONLY',
                });
            },
        },
        {
            text: 'Private',
            selected: state.hasTag('Private Visibility'),
            onPress: () => {
                send({
                    type: 'Update Visibility',
                    visibility: 'PRIVATE',
                });
            },
        },
    ];

    return (
        <View>
            <Text sx={{ color: 'white', fontSize: 'l' }}>{title}</Text>

            <View
                sx={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                {options.map(({ text, selected, onPress }, index) => {
                    return (
                        <View
                            key={index}
                            sx={{
                                paddingTop: 'xl',
                                marginX: 'm',
                            }}
                        >
                            <MtvRoomCreationFormOptionButton
                                key={text}
                                text={text}
                                isSelected={selected}
                                onPress={onPress}
                                shouldApplyRightMargin={false}
                            />
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const MySettings: React.FC<MySettingsScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [state] = useMachine(settingsMachine);

    const settings = [
        {
            containerTestID: 'playlists-visibility-radio-group',
            title: 'Playlists visibility',
            visibilitySettingActor: state.children[
                'Playlists Visibility Manager Machine'
            ] as VisibilitySettingMachineActor,
        },
        {
            containerTestID: 'playlists-relations-radio-group',
            title: 'Relations visibility',
            visibilitySettingActor: state.children[
                'Relations Visibility Manager Machine'
            ] as VisibilitySettingMachineActor,
        },
    ];

    return (
        <AppScreen>
            <AppScreenHeader
                title="My Settings"
                insetTop={insets.top}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer>
                <ScrollView
                    sx={{
                        flex: 1,
                    }}
                    contentContainerStyle={{
                        paddingBottom: insets.bottom,
                    }}
                >
                    <View
                        sx={{
                            flex: 1,
                            paddingBottom: 'xxl',
                            paddingLeft: 'l',
                            paddingRight: 'l',
                            maxWidth: [null, 420, 720],
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}
                    >
                        {settings.map(
                            (
                                {
                                    containerTestID,
                                    title,
                                    visibilitySettingActor,
                                },
                                index,
                            ) => {
                                const isLastSetting =
                                    index === settings.length - 1;
                                const isNotLastSetting =
                                    isLastSetting === false;

                                return (
                                    <View
                                        testID={containerTestID}
                                        key={index}
                                        sx={{
                                            marginBottom:
                                                isNotLastSetting === true
                                                    ? 'xxl'
                                                    : undefined,
                                        }}
                                    >
                                        <VisibilitySetting
                                            title={title}
                                            visibilitySettingActor={
                                                visibilitySettingActor
                                            }
                                        />
                                    </View>
                                );
                            },
                        )}
                    </View>
                </ScrollView>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MySettings;
