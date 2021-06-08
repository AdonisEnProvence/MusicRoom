import { Button } from '@dripsy/core';
import React from 'react';
import { Block, Title } from '../components/kit';
import { ColorModeProps } from '../navigation';
import { SettingsScreenProps } from '../types';

const SettingsScreen: React.FC<ColorModeProps & SettingsScreenProps> = ({
    toggleColorScheme,
}) => {
    return (
        <Block background={'primary'}>
            <Title>Settings page</Title>
            <Button
                onPress={() => {
                    toggleColorScheme();
                }}
                title="toto"
            />
        </Block>
    );
};

export default SettingsScreen;
