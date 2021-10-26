import { Text } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { UserProfileScreenProps } from '../types';

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
    navigation,
    route,
}) => {
    const insets = useSafeAreaInsets();
    const userID = route.params.userID;
    if (userID === undefined || userID === null) {
        throw new Error('UserProfile received no userID');
    }

    return (
        <AppScreen>
            <AppScreenHeader
                title="userName profile"
                insetTop={insets.top}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer>
                <Text>{userID} Profile Screen</Text>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default UserProfileScreen;
