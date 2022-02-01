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

const MySettings: React.FC<MySettingsScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    function noop() {
        return undefined;
    }

    const settings = [
        {
            title: 'Playlists visibility',
            options: [
                {
                    text: 'Public',
                    selected: true,
                    onPress: noop,
                },
                {
                    text: 'Followers only',
                    selected: false,
                    onPress: noop,
                },
                {
                    text: 'Private',
                    selected: false,
                    onPress: noop,
                },
            ],
        },
        {
            title: 'Relations visibility',
            options: [
                {
                    text: 'Public',
                    selected: true,
                    onPress: noop,
                },
                {
                    text: 'Followers only',
                    selected: false,
                    onPress: noop,
                },
                {
                    text: 'Private',
                    selected: false,
                    onPress: noop,
                },
            ],
        },
        {
            title: 'Devices visibility',
            options: [
                {
                    text: 'Public',
                    selected: true,
                    onPress: noop,
                },
                {
                    text: 'Followers only',
                    selected: false,
                    onPress: noop,
                },
                {
                    text: 'Private',
                    selected: false,
                    onPress: noop,
                },
            ],
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
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                    }}
                >
                    {settings.map(({ title, options }, index) => {
                        const isLastSetting = index === settings.length - 1;
                        const isNotLastSetting = isLastSetting === false;

                        return (
                            <View
                                key={index}
                                sx={{
                                    paddingLeft: 'l',
                                    paddingRight: 'l',
                                    maxWidth: [null, 420, 720],
                                    marginLeft: 'auto',
                                    marginRight: 'auto',
                                    marginBottom:
                                        isNotLastSetting === true
                                            ? 'xxl'
                                            : undefined,

                                    justifyContent: 'space-between',
                                }}
                            >
                                <Text sx={{ color: 'white', fontSize: 'l' }}>
                                    {title}
                                </Text>

                                <View
                                    sx={{
                                        marginTop: 'xl',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    {options.map(
                                        (
                                            { text, selected, onPress },
                                            index,
                                        ) => {
                                            const isNotLastButton =
                                                index < options.length - 1;

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
                            </View>
                        );
                    })}
                </ScrollView>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MySettings;
