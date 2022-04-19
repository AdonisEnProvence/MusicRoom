import { useInterpret, useSelector } from '@xstate/react';
import { Button, Text, useSx, View } from 'dripsy';
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
            <View
                testID={testID}
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

    if (userProfileInformation === undefined) {
        return (
            <AppScreen>
                <AppScreenHeader
                    title=""
                    insetTop={insets.top}
                    canGoBack={true}
                    goBack={() => {
                        navigation.goBack();
                    }}
                />

                <AppScreenContainer testID="default-profile-page-screen">
                    {userNotFound ? (
                        <>
                            <Text>User not found</Text>
                            <Button
                                title="Go back"
                                onPress={() => navigation.goBack()}
                            />
                        </>
                    ) : (
                        <View testID="default-profile-page-screen-loading" />
                    )}
                </AppScreenContainer>
            </AppScreen>
        );
    }

    const userProfileInformationSections: UserProfileInformationSection[] = [
        {
            informationName: 'followers',
            onPress: () => {
                navigation.navigate('UserFollowersSearch', {
                    userID,
                });
            },
            informationCounter: userProfileInformation.followersCounter,
        },
        {
            informationName: 'following',
            onPress: () => {
                navigation.navigate('UserFollowingSearch', {
                    userID,
                });
            },
            informationCounter: userProfileInformation.followingCounter,
        },
        {
            informationName: 'playlists',
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

                    {userProfileInformationSections.map(
                        ({ informationName, onPress, informationCounter }) => (
                            <UserProfileInformationSection
                                key={`${userProfileInformation.userID}_${informationName}`}
                                testID={`${userProfileInformation.userID}-${informationName}-user-profile-information`}
                                informationName={informationName}
                                onPress={onPress}
                                informationCounter={informationCounter}
                            />
                        ),
                    )}

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
