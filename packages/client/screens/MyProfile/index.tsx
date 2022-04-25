import { useMachine } from '@xstate/react';
import { ScrollView, Text, useSx, View } from 'dripsy';
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
import { generateUserAvatarUri } from '../../constants/users-avatar';
import { getMyProfileInformation } from '../../services/UsersSearchService';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import ErrorScreen from '../kit/ErrorScreen';
import LoadingScreen from '../kit/LoadingScreen';

interface MyProfileInformationSectionProps {
    onPress: () => void;
    informationName: string;
    informationCounter: number | undefined;
}

const MyProfileInformationSection: React.FC<MyProfileInformationSectionProps> =
    ({ informationName, informationCounter, onPress }) => {
        const sx = useSx();
        const testID = `my-profile-${informationName}-${informationCounter}`;
        const informationIsNotVisibleForUser = informationCounter === undefined;
        if (informationIsNotVisibleForUser) {
            return null;
        }

        return (
            <TouchableOpacity
                testID={testID}
                onPress={() => onPress()}
                style={sx({
                    padding: 'l',
                    backgroundColor: 'greyLighter',
                    borderRadius: 's',
                    textAlign: 'left',
                })}
            >
                <Text
                    sx={{
                        color: 'greyLight',
                        fontSize: 'm',
                    }}
                >
                    {informationName}
                </Text>
                <Text
                    sx={{
                        marginTop: 's',
                        color: 'black',
                        fontWeight: 'bold',
                        fontSize: 'l',
                    }}
                >
                    {informationCounter}
                </Text>
            </TouchableOpacity>
        );
    };

const MyProfileScreen: React.FC<MyProfileScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();

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
        getMyProfileInformation(),
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

    if (userNotFound) {
        return (
            <ErrorScreen
                title="My profile"
                message="User not found"
                testID="default-my-profile-page-screen"
            />
        );
    }

    if (myProfileInformation === undefined) {
        return (
            <LoadingScreen
                title="My profile"
                testID="default-my-profile-page-screen"
            />
        );
    }

    const { userNickname, userID } = myProfileInformation;
    const myProfileInformationSections: MyProfileInformationSectionProps[] = [
        {
            informationName: 'Followers',
            onPress: handleGoToMyFollowers,
            informationCounter: myProfileInformation.followersCounter,
        },
        {
            informationName: 'Following',
            onPress: handleGoToMyFollowing,
            informationCounter: myProfileInformation.followingCounter,
        },
        {
            informationName: 'Playlists',
            onPress: handleGoToMyLibrary,
            informationCounter: myProfileInformation.playlistsCounter,
        },
        {
            informationName: 'Devices',
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
                                testID="go-to-my-settings-button"
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

            <AppScreenContainer
                testID="my-profile-page-container"
                sx={{
                    flex: 1,
                }}
            >
                <ScrollView
                    sx={{
                        flex: 1,
                    }}
                >
                    <View
                        sx={{
                            width: '100%',
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

                        <Typo>{userNickname}</Typo>
                        <View
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                flexDirection: 'row',
                                width: '100%',
                                marginTop: 'xl',
                                marginBottom: 'xl',
                            }}
                        >
                            {myProfileInformationSections.map(
                                ({
                                    informationName,
                                    onPress,
                                    informationCounter,
                                }) => (
                                    <View
                                        sx={{
                                            flex: 1,
                                            flexBasis: ['100%', '50%'],
                                            padding: 'l',
                                        }}
                                        key={`${userID}_${informationName}`}
                                    >
                                        <MyProfileInformationSection
                                            informationName={informationName}
                                            onPress={onPress}
                                            informationCounter={
                                                informationCounter
                                            }
                                        />
                                    </View>
                                ),
                            )}
                        </View>
                    </View>
                </ScrollView>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MyProfileScreen;
