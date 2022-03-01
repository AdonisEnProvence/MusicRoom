import { useInterpret, useMachine, useSelector } from '@xstate/react';
import { Button, Text, useSx, View } from 'dripsy';
import React, { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useQuery } from 'react-query';
import { MyProfileInformation } from '@musicroom/types';
import Toast from 'react-native-toast-message';
import { createMachine } from 'xstate';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    SvgImage,
    Typo,
} from '../../components/kit';
import { MyProfileScreenProps } from '../../types';
import { getFakeUserID } from '../../contexts/SocketContext';
import { generateUserAvatarUri } from '../../constants/users-avatar';
import { getMyProfileInformation } from '../../services/UsersSearchService';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';

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

    const [state, sendToMachine] = useMachine(() =>
        createMachine({
            initial: 'loading',
            states: {
                loading: {},
                userFound: {},

                userNotFound: {
                    tags: 'userNotFound',
                },
            },

            on: {
                USER_FOUND: {
                    target: 'userFound',
                },

                USER_NOT_FOUND: {
                    target: 'userNotFound',
                    actions: () => {
                        Toast.show({
                            type: 'error',
                            text1: 'User not found',
                        });
                    },
                },
            },
        }),
    );
    const userNotFound = state.hasTag('userNotFound');

    const {
        data: myProfileInformation,
        status,
        refetch,
    } = useQuery<MyProfileInformation, Error>('myProfileInformation', () =>
        getMyProfileInformation({
            tmpAuthUserID: getFakeUserID(),
        }),
    );

    useRefreshOnFocus(refetch);

    useEffect(() => {
        if (status === 'success' && myProfileInformation) {
            sendToMachine({
                type: 'USER_FOUND',
                myProfileInformation,
            });
        } else if (status === 'error') {
            sendToMachine('USER_NOT_FOUND');
        }
    }, [myProfileInformation, status, sendToMachine]);

    function handleGoToMyLibrary() {
        navigation.navigate('Main', {
            screen: 'Root',
            params: {
                screen: 'Library',
                params: {
                    screen: 'MpeRooms',
                },
            },
        });
    }

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

    if (myProfileInformation === undefined || userNotFound) {
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
            onPress: handleGoToMyLibrary,
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
