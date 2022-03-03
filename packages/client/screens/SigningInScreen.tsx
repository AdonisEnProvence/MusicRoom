import { Button } from 'dripsy';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    TextField,
} from '../components/kit';
import { useAppContext } from '../contexts/AppContext';
import { SigningInScreenProps } from '../types';

const SigningInScreen: React.FC<SigningInScreenProps> = () => {
    const insets = useSafeAreaInsets();
    const { appService } = useAppContext();
    const [email, setEmail] = useState('devessier@devessier.fr');
    const [password, setPassword] = useState('devessierBgDu13');

    function handleSigningInSubmit() {
        appService.send({
            type: 'SIGN_IN',
            email,
            password,
        });
    }

    return (
        <AppScreen>
            <AppScreenHeader title="Signing in" insetTop={insets.top} />

            <AppScreenContainer>
                <TextField
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor="#fff"
                />

                <TextField
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="#fff"
                />

                <Button title="Submit" onPress={handleSigningInSubmit} />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default SigningInScreen;
