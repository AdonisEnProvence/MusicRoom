import { useInterpret, useSelector } from '@xstate/react';
import { Button, Text } from 'dripsy';
import React, { useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
