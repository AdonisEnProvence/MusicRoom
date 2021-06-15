import { Button } from '@dripsy/core';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { HomeTabHomeXScreenProps } from '../types';

const HomeScreen: React.FC<HomeTabHomeXScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    return (
        <AppScreen>
            <AppScreenHeader title="Home" insetTop={insets.top} />

            <AppScreenContainer>
                <Button
                    title="Go to Music Track Vote"
                    onPress={() => {
                        navigation.navigate('MusicTrackVoteSearch');
                    }}
                />

                <Button
                    title="Go settings"
                    onPress={() => {
                        navigation.navigate('Settings');
                    }}
                />
                <Button
                    title="Go chat"
                    onPress={() => {
                        navigation.navigate('Chat');
                    }}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default HomeScreen;
