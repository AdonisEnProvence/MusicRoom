import React from 'react';
import Block from '../components/template/Block';
import Typo from '../components/template/Typo';

const HomeScreen: React.FC = () => {
    return (
        <Block background={'primary'}>
            <Typo>Home</Typo>
        </Block>
    );
};

export default HomeScreen;
