import { Button } from '@dripsy/core';
import React from 'react';
import Block from '../components/template/Block';
import Title from '../components/template/Title';
import Player from '../components/MusicPlayer';
import { HomeTabHomeXScreenProps } from '../types';

const HomeScreen: React.FC<HomeTabHomeXScreenProps> = ({ navigation }) => {
    return (
        <Block background={'primary'}>
            <Title>This is a basic home</Title>

            <Player />

            <Button
                title="Go to Music Track Vote"
                onPress={() => {
                    navigation.navigate('Home', {
                        screen: 'HomeX',
                    });
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
        </Block>
    );
};

export default HomeScreen;
