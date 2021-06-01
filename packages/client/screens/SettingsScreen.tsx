import { Button } from '@dripsy/core';
import React from 'react';
import Block from '../components/template/Block';
import Title from '../components/template/Title';
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
