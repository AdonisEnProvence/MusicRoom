import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '@motify/skeleton';
import { useActor, useMachine } from '@xstate/react';
import { ScrollView, Text, useSx, View } from 'dripsy';
import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
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

interface SettingContainerProps {
    title: string;
}

const SettingContainer: React.FC<SettingContainerProps> = ({
    title,
    children,
}) => {
    return (
        <View>
            <Text sx={{ color: 'white', fontSize: 'l' }}>{title}</Text>

            {children}
        </View>
    );
};

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
        <SettingContainer title={title}>
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
        </SettingContainer>
    );
};

const MySettingsScreen: React.FC<MySettingsScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();
    const [state] = useMachine(settingsMachine);

    const settingsState = useMemo(() => {
        if (state.hasTag("Errored fetching user's settings")) {
            return {
                status: 'errored' as const,
            };
        }

        if (state.hasTag('Debouncing loading state')) {
            return {
                status: 'debouncing' as const,
            };
        }

        if (state.hasTag("Loading user's settings")) {
            return {
                status: 'loading' as const,
            };
        }

        if (state.hasTag("Fetched user's settings")) {
            return {
                status: 'success' as const,
                settings: [
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
                ],
            };
        }

        throw new Error('Reached unreachable state');
    }, [state]);

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
                            maxWidth: [null, 420],
                            width: '100%',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}
                    >
                        {settingsState.status === 'success' ? (
                            <>
                                <View
                                    sx={{
                                        marginBottom: 'xxl',
                                    }}
                                >
                                    <SettingContainer title="Personal information">
                                        <View
                                            sx={{
                                                paddingTop: 'm',
                                            }}
                                        >
                                            <TouchableOpacity
                                                onPress={() => {
                                                    navigation.navigate(
                                                        'MySettingsUpdateNickname',
                                                    );
                                                }}
                                                style={sx({
                                                    flexDirection: 'row',
                                                    justifyContent:
                                                        'space-between',
                                                    paddingX: 'm',
                                                    paddingY: 'l',
                                                })}
                                            >
                                                <Text sx={{ color: 'white' }}>
                                                    Nickname
                                                </Text>

                                                <View
                                                    sx={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <Text
                                                        sx={{
                                                            color: 'greyLighter',
                                                            marginRight: 's',
                                                        }}
                                                    >
                                                        Devessier
                                                    </Text>

                                                    <Ionicons
                                                        name="chevron-forward"
                                                        size={16}
                                                        style={sx({
                                                            color: 'greyLighter',
                                                        })}
                                                    />
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </SettingContainer>
                                </View>

                                {settingsState.settings.map(
                                    (
                                        {
                                            containerTestID,
                                            title,
                                            visibilitySettingActor,
                                        },
                                        index,
                                    ) => {
                                        const isLastSetting =
                                            index ===
                                            settingsState.settings.length - 1;
                                        const isNotLastSetting =
                                            isLastSetting === false;

                                        return (
                                            <View
                                                testID={containerTestID}
                                                key={index}
                                                sx={{
                                                    marginBottom:
                                                        isNotLastSetting ===
                                                        true
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
                            </>
                        ) : settingsState.status === 'errored' ? (
                            <Text sx={{ color: 'white', fontSize: 'm' }}>
                                An error occured while loading your settings
                            </Text>
                        ) : settingsState.status === 'loading' ? (
                            <View
                                sx={{ flex: 1 }}
                                accessibilityLabel="Loading your settings"
                            >
                                <View sx={{ marginBottom: 'xl' }}>
                                    <Skeleton width="100%" show />
                                </View>

                                <View sx={{ marginBottom: 'xl' }}>
                                    <Skeleton width="100%" show />
                                </View>

                                <View>
                                    <Skeleton width="100%" show />
                                </View>
                            </View>
                        ) : null}
                    </View>
                </ScrollView>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MySettingsScreen;
