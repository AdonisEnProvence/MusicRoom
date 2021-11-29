import { Text } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { SettingsScreenProps } from '../types';

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    return (
        <AppScreen>
            <AppScreenHeader
                title="Settings"
                insetTop={insets.top}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer>
                <Text>Settings screen</Text>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default SettingsScreen;
