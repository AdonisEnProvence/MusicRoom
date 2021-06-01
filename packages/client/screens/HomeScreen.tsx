import { Button } from '@dripsy/core';
import { useNavigation } from '@react-navigation/core';
import React from 'react';
import Block from '../components/template/Block';
import Title from '../components/template/Title';
import Player from '../components/MusicPlayer';

const HomeScreen: React.FC = () => {
    const navigation = useNavigation();

    return (
        <Block background={'primary'}>
            <Title>This is a basic home</Title>

            <Player />

            <Button
                title="Go settings"
                onPress={() => navigation.navigate('Settings')}
            />
            <Button
                title="Go chat"
                onPress={() => navigation.navigate('Chat')}
            />
        </Block>
    );
};

export default HomeScreen;
