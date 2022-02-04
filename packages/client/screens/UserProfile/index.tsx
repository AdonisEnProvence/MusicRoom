import { useInterpret, useSelector } from '@xstate/react';
import { Button, Text, useSx, View } from 'dripsy';
import React, { useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../../components/kit';
import { UserProfileScreenProps } from '../../types';
import { createUserProfileInformationMachine } from '../../machines/userProfileInformationMachine';

type UserProfileContentProps = UserProfileScreenProps & {
    userID: string;
};

interface UserProfileInformationSectionProps {
    onPress: () => void;
    informationName: string;
    informationCounter: number | undefined;
}

const UserProfileInformationSection: React.FC<UserProfileInformationSectionProps> =
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

const UserProfileContent: React.FC<UserProfileContentProps> = ({
    userID,
    navigation,
}) => {
    const insets = useSafeAreaInsets();

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
                        <Text>LOADING</Text>
                    )}
                </AppScreenContainer>
            </AppScreen>
        );
    }

    const userProfileInformationSections: UserProfileInformationSectionProps[] =
        [
            {
                informationName: 'followers',
                onPress: () => {
                    console.log('followers section pressed');
                },
                informationCounter: userProfileInformation.followersCounter,
            },
            {
                informationName: 'following',
                onPress: () => {
                    console.log('following section pressed');
                },
                informationCounter: userProfileInformation.followingCounter,
            },
            {
                informationName: 'playlists',
                onPress: () => {
                    console.log('paylists section pressed');
                },
                informationCounter: userProfileInformation.playlistsCounter,
            },
        ];

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
                {userProfileInformationSections.map(
                    ({ informationName, onPress, informationCounter }) => (
                        <UserProfileInformationSection
                            key={`${userProfileInformation.userID}_${informationName}`}
                            informationName={informationName}
                            onPress={onPress}
                            informationCounter={informationCounter}
                        />
                    ),
                )}
                {userProfileInformation.following ? (
                    <Button
                        title="UNFOLLOW"
                        onPress={() => {
                            console.log('unfollow');
                        }}
                    />
                ) : (
                    <Button
                        title="FOLLOW"
                        onPress={() => {
                            console.log('follow');
                        }}
                    />
                )}
            </AppScreenContainer>
        </AppScreen>
    );
};

//Wrapping UserProfileScreen content inside a second component
//To allow useInterpret to recompute a machine when userID comes to change
//The key given to the UserProfileContent when changing will bring the componement to rerender
//And then to rerun a useInterpret with the new userID
const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
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

export default UserProfileScreen;
