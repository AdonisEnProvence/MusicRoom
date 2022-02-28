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
    SvgImage,
    Typo,
} from '../../components/kit';
import { MyProfileScreenProps } from '../../types';
import { getFakeUserID } from '../../contexts/SocketContext';
import { createMyProfileInformationMachine } from '../../machines/myProfileInformationMachine';
import { generateUserAvatarUri } from '../../constants/users-avatar';

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

    function handleGoToMyDevices() {
        navigation.navigate('MyDevices');
    }

    function handleGoToMyFollowers() {
        navigation.navigate('MyFollowers');
    }

    function handleGoToMyFollowing() {
        navigation.navigate('MyFollowing');
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
            onPress: handleGoToMyFollowers,
            informationCounter: myProfileInformation.followersCounter,
        },
        {
            informationName: 'following',
            onPress: handleGoToMyFollowing,
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
            onPress: handleGoToMyDevices,
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
                <View
                    sx={{
                        flex: 1,
                        paddingX: 'l',
                        maxWidth: [null, 420, 720],
                        marginX: 'auto',
                        alignItems: 'center',
                    }}
                >
                    <View
                        sx={{
                            padding: 'l',
                            marginBottom: 'xl',
                            borderRadius: 'full',
                            backgroundColor: 'greyLight',
                        }}
                    >
                        <SvgImage
                            uri={generateUserAvatarUri({ userID })}
                            accessibilityLabel="My avatar"
                            style={sx({
                                width: 'xl',
                                height: 'xl',
                                borderRadius: 'full',
                            })}
                        />
                    </View>

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
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MyProfileScreen;
