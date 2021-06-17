import React from 'react';
import { Button, Text, View } from 'react-native';
import { AlertScreenProps } from '../types';

export const AlertScreen: React.FC<AlertScreenProps> = ({
    navigation,
    route,
}) => {
    const reason = route.params.reason;
    console.log(reason);
    return (
        <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
            <Text style={{ fontSize: 30 }}>{reason || 'undefined'}</Text>
            <Button onPress={() => navigation.goBack()} title="Dismiss" />
        </View>
    );
};
