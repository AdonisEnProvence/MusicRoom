import { useInterpret, useSelector } from '@xstate/react';
import { Button, Text, useSx, View } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    Typo,
} from '../../components/kit';
import { MyProfileScreenProps } from '../../types';
import { getFakeUserID } from '../../contexts/SocketContext';
import { createMyProfileInformationMachine } from '../../machines/myProfileInformationMachine';

interface MyProfileInformationSectionProps {
    onPress: () => void;
    informationName: string;
    informationCounter: number | undefined;
}

const MyProfileInformationSection: React.FC<MyProfileInformationSectionProps> =
    ({ informationName, informationCounter, onPress }) => {
        const sx = useSx();

        const informationIsNotVisibleForUser = informationCounter === undefined;
        if (informationIsNotVisibleForUser) {
            return null;
        }

        return (
            <View
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                }}
            >
                <TouchableOpacity
                    onPress={() => onPress()}
                    style={sx({
                        backgroundColor: 'gold',
                        padding: 'l',
                        borderRadius: 's',
                        textAlign: 'center',
                    })}
                >
                    <Text>{`${informationName} ${informationCounter}`}</Text>
                </TouchableOpacity>
            </View>
        );
    };

const MyProfileScreen: React.FC<MyProfileScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();
    const userID = getFakeUserID();

    const userProfileInformationService = useInterpret(() =>
        createMyProfileInformationMachine(),
    );

    const myProfileInformation = useSelector(
        userProfileInformationService,
        (state) => state.context.myProfileInformation,
    );

    const userNotFound = useSelector(userProfileInformationService, (state) =>
        state.hasTag('userNotFound'),
    );

    function handleGoToMySettingsScreen() {
        navigation.navigate('MySettings');
    }

    if (myProfileInformation === undefined) {
        return (
            <AppScreen>
                <AppScreenHeader
                    title="My profile"
                    insetTop={insets.top}
                    canGoBack
                    goBack={() => {
                        navigation.goBack();
                    }}
                />

                <AppScreenContainer testID="default-my-profile-page-screen">
                    {userNotFound ? (
                        <>
                            <Text>User not found</Text>
                            <Button
                                title="Go back"
                                onPress={() => navigation.goBack()}
                            />
                        </>
                    ) : (
                        <Text>LOADING</Text>
                    )}
                </AppScreenContainer>
            </AppScreen>
        );
    }

    const myProfileInformationSections: MyProfileInformationSectionProps[] = [
        {
            informationName: 'followers',
            onPress: () => {
                console.log('followers section pressed');
            },
            informationCounter: myProfileInformation.followersCounter,
        },
        {
            informationName: 'following',
            onPress: () => {
                console.log('following section pressed');
            },
            informationCounter: myProfileInformation.followingCounter,
        },
        {
            informationName: 'playlists',
            onPress: () => {
                console.log('paylists section pressed');
            },
            informationCounter: myProfileInformation.playlistsCounter,
        },
        {
            informationName: 'devices',
            onPress: () => {
                console.log('devices section pressed');
            },
            informationCounter: myProfileInformation.devicesCounter,
        },
    ];

    return (
        <AppScreen>
            <AppScreenHeader
                title={`My profile`}
                insetTop={insets.top}
                canGoBack
                goBack={() => {
                    navigation.goBack();
                }}
                HeaderRight={() => {
                    return (
                        <TouchableOpacity onPress={handleGoToMySettingsScreen}>
                            <Ionicons
                                name="cog"
                                accessibilityLabel="Open my settings screen"
                                style={sx({
                                    fontSize: 'm',
                                    color: 'white',
                                    padding: 's',
                                })}
                            />
                        </TouchableOpacity>
                    );
                }}
            />

            <AppScreenContainer testID="my-profile-page-container">
                <Typo>{userID} my profile</Typo>
                {myProfileInformationSections.map(
                    ({ informationName, onPress, informationCounter }) => (
                        <MyProfileInformationSection
                            key={`${userID}_${informationName}`}
                            informationName={informationName}
                            onPress={onPress}
                            informationCounter={informationCounter}
                        />
                    ),
                )}
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MyProfileScreen;
