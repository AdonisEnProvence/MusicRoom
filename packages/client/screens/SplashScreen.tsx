import { Text, View } from 'dripsy';
import React from 'react';
import { AppScreen } from '../components/kit';

export const SplashScreen: React.FC = () => {
    return (
        <AppScreen>
            <View
                sx={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Text sx={{ color: 'white' }}>Loading</Text>
            </View>
        </AppScreen>
    );
};
