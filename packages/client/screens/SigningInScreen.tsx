import { SafeAreaView, Text, useSx, View } from 'dripsy';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import * as z from 'zod';
import { useSelector } from '@xstate/react';
import { AppScreen, TextField } from '../components/kit';
import { useAppContext } from '../contexts/AppContext';
import { SigningInScreenProps } from '../types';

interface SigningInFormFieldValues {
    email: string;
    password: string;
}

const SigningInScreen: React.FC<SigningInScreenProps> = ({ navigation }) => {
    const sx = useSx();
    const { appService } = useAppContext();
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SigningInFormFieldValues>();
    const credentialsAreInvalid = useSelector(
        appService,
        (state) => state.hasTag('signingInCredentialsAreInvalid') === true,
    );
    const unknownErrorOccured = useSelector(
        appService,
        (state) =>
            state.hasTag('unknownErrorOccuredDuringSubmittingSigningInForm') ===
            true,
    );

    function handleSigningInSubmit({
        email,
        password,
    }: SigningInFormFieldValues) {
        appService.send({
            type: 'SIGN_IN',
            email,
            password,
        });
    }

    function handleGoToSignUpFormScreen() {
        navigation.navigate('SignUpFormScreen');
    }

    return (
        <AppScreen testID="sign-in-screen-container">
            <SafeAreaView sx={{ flex: 1 }}>
                <Text
                    sx={{
                        color: 'white',
                        fontSize: 'l',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginX: 'auto',
                        marginTop: 'xl',
                    }}
                >
                    MusicRoom
                </Text>

                <View
                    sx={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <View
                        sx={{
                            width: 520,
                            flexShrink: 1,
                        }}
                    >
                        <View sx={{ paddingX: 'l' }}>
                            <Text
                                sx={{
                                    color: 'white',
                                    fontSize: 'm',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    marginBottom: 'xl',
                                }}
                            >
                                Welcome back Popol!
                            </Text>

                            {credentialsAreInvalid === true ||
                            unknownErrorOccured === true ? (
                                <View
                                    testID="signing-in-screen-server-error"
                                    sx={{ marginBottom: 'xl' }}
                                >
                                    <Text
                                        accessibilityRole="alert"
                                        sx={{ color: 'red' }}
                                    >
                                        {credentialsAreInvalid === true
                                            ? 'Credentials are invalid'
                                            : 'An unknown error occured, please try again later'}
                                    </Text>
                                </View>
                            ) : null}

                            <View
                                testID="signing-in-screen-email-field"
                                sx={{ marginBottom: 'xl' }}
                            >
                                <Text
                                    sx={{
                                        color: 'greyLighter',
                                        fontSize: 'xs',
                                        fontWeight: 'bold',
                                        textAlign: 'left',
                                        marginBottom: 'm',
                                    }}
                                >
                                    Nickname
                                </Text>

                                <Controller
                                    control={control}
                                    name="email"
                                    defaultValue="devessier@devessier.fr"
                                    rules={{
                                        required: {
                                            value: true,
                                            message: 'This field is required',
                                        },
                                        validate: {
                                            isValidEmail: (email) => {
                                                return (
                                                    z
                                                        .string()
                                                        .email()
                                                        .check(email) ||
                                                    'Not a well formed email address'
                                                );
                                            },
                                        },
                                    }}
                                    render={({
                                        field: { onChange, onBlur, value },
                                    }) => {
                                        return (
                                            <TextField
                                                value={value}
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                placeholder="Email"
                                                placeholderTextColor="#fff"
                                                keyboardType="email-address"
                                                autoCompleteType="email"
                                                sx={{
                                                    borderWidth: 1,
                                                    borderColor: 'greyLighter',
                                                }}
                                            />
                                        );
                                    }}
                                />

                                {errors.email?.message && (
                                    <Text
                                        accessibilityRole="alert"
                                        sx={{ color: 'red', marginTop: 's' }}
                                    >
                                        {errors.email.message}
                                    </Text>
                                )}
                            </View>

                            <View
                                testID="signing-in-screen-password-field"
                                sx={{ marginBottom: 'xl' }}
                            >
                                <Text
                                    sx={{
                                        color: 'greyLighter',
                                        fontSize: 'xs',
                                        fontWeight: 'bold',
                                        textAlign: 'left',
                                        marginBottom: 'm',
                                    }}
                                >
                                    Password
                                </Text>

                                <Controller
                                    control={control}
                                    name="password"
                                    defaultValue="devessierBgDu13"
                                    rules={{
                                        required: {
                                            value: true,
                                            message: 'This field is required',
                                        },
                                    }}
                                    render={({
                                        field: { onChange, onBlur, value },
                                    }) => {
                                        return (
                                            <TextField
                                                value={value}
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                placeholder="Password"
                                                placeholderTextColor="#fff"
                                                secureTextEntry
                                                autoCompleteType="password"
                                                sx={{
                                                    borderWidth: 1,
                                                    borderColor: 'greyLighter',
                                                }}
                                            />
                                        );
                                    }}
                                />

                                {errors.password?.message && (
                                    <Text
                                        accessibilityRole="alert"
                                        sx={{ color: 'red', marginTop: 's' }}
                                    >
                                        {errors.password.message}
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                onPress={handleSubmit(handleSigningInSubmit)}
                                style={sx({
                                    paddingX: 's',
                                    paddingY: 'm',
                                    backgroundColor: 'greyLighter',
                                    borderRadius: 's',
                                })}
                            >
                                <Text
                                    sx={{
                                        color: 'greyLight',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Log in
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleGoToSignUpFormScreen}
                                style={sx({
                                    paddingX: 's',
                                    paddingY: 'm',
                                })}
                            >
                                <Text
                                    sx={{
                                        color: 'white',
                                        textAlign: 'center',
                                        fontSize: 's',
                                    }}
                                >
                                    Or sign up ?
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </AppScreen>
    );
};

export default SigningInScreen;
