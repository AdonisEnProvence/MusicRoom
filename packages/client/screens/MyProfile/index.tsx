import { useInterpret, useSelector } from '@xstate/react';
import { Button, Text } from 'dripsy';
import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    Typo,
} from '../../components/kit';
import { UserProfileScreenProps } from '../../types';
import { getFakeUserID } from '../../contexts/SocketContext';

const MyProfileScreen: React.FC<UserProfileScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const userID = getFakeUserID();

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
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MyProfileScreen;
