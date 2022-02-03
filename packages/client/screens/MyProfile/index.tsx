import { useInterpret, useSelector } from '@xstate/react';
import { Button, Text } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    Typo,
} from '../../components/kit';
import { UserProfileScreenProps } from '../../types';
import { getFakeUserID } from '../../contexts/SocketContext';
import { createMyProfileInformationMachine } from '../../machines/myProfileInformationMachine';

const MyProfileScreen: React.FC<UserProfileScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
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

    if (myProfileInformation === undefined) {
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

    return (
        <AppScreen>
            <AppScreenHeader
                title={`My profile`}
                insetTop={insets.top}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer testID="my-profile-page-container">
                <Typo>{userID} my profile</Typo>
                <Typo>My Devices: {myProfileInformation.devicesCounter}</Typo>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MyProfileScreen;
