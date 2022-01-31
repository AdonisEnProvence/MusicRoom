import { useInterpret, useMachine, useSelector } from '@xstate/react';
import { Button, Text } from 'dripsy';
import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { UserProfileScreenProps } from '../types';
import { createUserProfileInformationMachine } from '../machines/profileInformationMachine';

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
    navigation,
    route,
}) => {
    const insets = useSafeAreaInsets();
    const userID = route.params.userID;
    if (userID === undefined || userID === null) {
        throw new Error('UserProfile received no userID');
    }

    const userProfileInformationMachineConfigured = useMemo(
        () => createUserProfileInformationMachine(userID),
        [userID],
    );

    const userProfileInformationService = useInterpret(
        userProfileInformationMachineConfigured,
    );

    const userProfileInformation = useSelector(
        userProfileInformationService,
        (state) => state.context.userProfileInformation,
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

                <AppScreenContainer>
                    <Text>LOADING</Text>
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

            <AppScreenContainer>
                <Text>{userID} Profile Screen</Text>
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

export default UserProfileScreen;
