import { SafeAreaView, Text, useSx, View } from 'dripsy';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import * as z from 'zod';
import { AppScreen, TextField } from '../components/kit';
import { useAppContext } from '../contexts/AppContext';
import { SigningInScreenProps } from '../types';

interface SigningInFormFieldValues {
    email: string;
    password: string;
}

const SigningInScreen: React.FC<SigningInScreenProps> = () => {
    const sx = useSx();
    const { appService } = useAppContext();
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<SigningInFormFieldValues>();

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

    return (
        <AppScreen>
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
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </AppScreen>
    );
};

export default SigningInScreen;
