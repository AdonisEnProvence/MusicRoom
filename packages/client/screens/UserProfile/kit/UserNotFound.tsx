import { Button, Text } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../../../components/kit';

interface UserNotFoundScreeenProps {
    testID: string;
    title: string;
}
const UserNotFoundScreen: React.FC<UserNotFoundScreeenProps> = ({
    testID,
    title,
}) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    return (
        <AppScreen>
            <AppScreenHeader
                title={title}
                insetTop={insets.top}
                canGoBack
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer testID={testID}>
                <Text>User not found</Text>
                <Button title="Go back" onPress={() => navigation.goBack()} />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default UserNotFoundScreen;
