import { useInterpret, useSelector } from '@xstate/react';
import { Button, ScrollView, Text, useSx, View } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    SvgImage,
} from '../../components/kit';
import { UserProfileIndexScreenProps } from '../../types';
import { createUserProfileInformationMachine } from '../../machines/userProfileInformationMachine';
import { generateUserAvatarUri } from '../../constants/users-avatar';
import LoadingScreen from '../kit/LoadingScreen';
import ErrorScreen from '../kit/ErrorScreen';

type UserProfileContentProps = UserProfileIndexScreenProps & {
    userID: string;
};

interface UserProfileInformationSection {
    onPress: () => void;
    informationName: string;
    informationCounter: number | undefined;
}

interface UserProfileInformationSectionProps
    extends UserProfileInformationSection {
    testID: string;
}

const UserProfileInformationSection: React.FC<UserProfileInformationSectionProps> =
    ({ informationName, informationCounter, onPress, testID }) => {
        const sx = useSx();

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

const UserProfileContent: React.FC<UserProfileContentProps> = ({
    userID,
    navigation,
}) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();

    const userProfileInformationService = useInterpret(() =>
        createUserProfileInformationMachine({ userID }),
    );

    const userProfileInformation = useSelector(
        userProfileInformationService,
        (state) => state.context.userProfileInformation,
    );

    const userNotFound = useSelector(userProfileInformationService, (state) =>
        state.hasTag('userNotFound'),
    );

    const isLoading = useSelector(userProfileInformationService, (state) =>
        state.hasTag('loading'),
    );

    if (userNotFound) {
        //Beware that userProfileInformation will be undefined here too
        //This assertion then has to be before the following
        return (
            <ErrorScreen
                testID="default-profile-page-screen"
                message="User not found"
                title="Loading user profile"
            />
        );
    }

    if (userProfileInformation === undefined) {
        return (
            <LoadingScreen
                title="Loading user profile"
                testID="default-profile-page-screen"
            />
        );
    }

    const userProfileInformationSections: UserProfileInformationSection[] = [
        {
            informationName: 'Followers',
            onPress: () => {
                navigation.navigate('UserFollowersSearch', {
                    userID,
                });
            },
            informationCounter: userProfileInformation.followersCounter,
        },
        {
            informationName: 'Following',
            onPress: () => {
                navigation.navigate('UserFollowingSearch', {
                    userID,
                });
            },
            informationCounter: userProfileInformation.followingCounter,
        },
        {
            informationName: 'Playlists',
            onPress: () => {
                navigation.navigate('UserMusicPlaylistEditorSearchScreen', {
                    userID,
                });
            },
            informationCounter: userProfileInformation.playlistsCounter,
        },
    ];

    function handleFollowPress() {
        userProfileInformationService.send({
            type: 'FOLLOW_USER',
        });
    }

    function handleUnfollowPress() {
        userProfileInformationService.send({
            type: 'UNFOLLOW_USER',
        });
    }

    return (
        <AppScreen>
            <AppScreenHeader
                title={`${userProfileInformation.userNickname} profile`}
                insetTop={insets.top}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer
                testID={`${userProfileInformation.userID}-profile-page-screen`}
            >
                <ScrollView
                    sx={{
                        flex: 1,
                    }}
                >
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
                                accessibilityLabel={`${userProfileInformation.userNickname} avatar`}
                                style={sx({
                                    width: 'xl',
                                    height: 'xl',
                                    borderRadius: 'full',
                                })}
                            />
                        </View>

                        <Text
                            sx={{
                                color: 'white',
                                marginBottom: 'xl',
                                fontSize: 'l',
                                fontWeight: 'bold',
                            }}
                        >
                            {userProfileInformation.userNickname}
                        </Text>

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
                            {userProfileInformationSections.map(
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
                                        key={`${userProfileInformation.userID}_${informationName}`}
                                    >
                                        <UserProfileInformationSection
                                            informationName={informationName}
                                            testID={`${userProfileInformation.userID}-${informationName}-user-profile-information`}
                                            onPress={onPress}
                                            informationCounter={
                                                informationCounter
                                            }
                                        />
                                    </View>
                                ),
                            )}
                        </View>

                        {userProfileInformation.following ? (
                            <Button
                                disabled={isLoading}
                                title="UNFOLLOW"
                                testID={`unfollow-${userID}-button`}
                                onPress={handleUnfollowPress}
                            />
                        ) : (
                            <Button
                                disabled={isLoading}
                                title="FOLLOW"
                                testID={`follow-${userID}-button`}
                                onPress={handleFollowPress}
                            />
                        )}
                    </View>
                </ScrollView>
            </AppScreenContainer>
        </AppScreen>
    );
};

//Wrapping UserProfileScreen content inside a second component
//To allow useInterpret to recompute a machine when userID comes to change
//The key given to the UserProfileContent when changing will bring the componement to rerender
//And then to rerun a useInterpret with the new userID
const UserProfileIndexScreen: React.FC<UserProfileIndexScreenProps> = ({
    navigation,
    route,
}) => {
    const userID = route.params.userID;
    if (userID === undefined || userID === null) {
        throw new Error('UserProfile received no userID');
    }

    return (
        <UserProfileContent
            route={route}
            navigation={navigation}
            userID={userID}
            key={userID}
        />
    );
};

export default UserProfileIndexScreen;
