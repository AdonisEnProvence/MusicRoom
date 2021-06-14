import { Button } from '@dripsy/core';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenHeader,
    AppScreenContainer,
} from '../components/kit';
import { ColorModeProps } from '../navigation';
import { SettingsScreenProps } from '../types';

const SettingsScreen: React.FC<ColorModeProps & SettingsScreenProps> = ({
    toggleColorScheme,
    navigation,
}) => {
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
                <Button
                    onPress={() => {
                        toggleColorScheme();
                    }}
                    title="Toggle theme"
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default SettingsScreen;
