import { SafeAreaView, Text, useSx, View } from 'dripsy';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import * as z from 'zod';
import { createMachine } from 'xstate';
import { useInterpret } from '@xstate/react';
import Toast from 'react-native-toast-message';
import { passwordStrengthRegex } from '@musicroom/types';
import { assertEventType } from '../../machines/utils';
import { AppScreen, TextField } from '../../components/kit';
import { sendSignUp, SignUpError } from '../../services/AuthenticationService';
import { SignUpFormScreenProps } from '../../types';
import { useAppContext } from '../../contexts/AppContext';

export interface AuthenticationSignUpFormFormFieldValues {
    userNickname: string;
    password: string;
    email: string;
}

type UpdateNicknameMachineEvent =
    | {
          type: 'Validated sign up form';
          body: AuthenticationSignUpFormFormFieldValues;
      }
    | { type: 'Signed up successfully' }
    | { type: 'Nickname unavailable' }
    | { type: 'Email unavailable' }
    | { type: 'Email invalid' }
    | { type: 'Weak password' }
    | { type: 'Unknown error' };

const signUpMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QFUAOECGAXMACAdgJYDGA1vhgLZgB0AYmFsQBaH5S4CusYATgOSxcPLFjZRYAYggB7fLTYA3GaVppMOAiXJVaDJq3ZceAoSLHtYCJTOLZCcgNoAGALqJQqGbEJi5HkAAPRAA2ZwAmGgAWAA5nAE4Y+IBGKNSAVmSYgBoQAE9QmIBmGhCYgHYQ9PS0mPSw5IBfRtz1bDwiMgpqekYWcWM+QWFGCwlJPl4ZXhpUABtsADNpyho2zU6dHv1+o24hs1HxKxs7P3wXdyQQLx9zgOCESpiaROciorjwmPCQkPLcgUEEkSvUYnFPuVylEos1Wuh2louroaABJCBzMCSABqGDmhA0kFwy14lACt18DnwD0QNWcNGS8T+UWhyXS8Q5RUBiHi9I5zgq5VS4SKUQF6ThIHWHW03VoAGUwPgIANNnLcFgZCNeIo+JJpRAkVs8LBOMRiHBYItOHM5kDPN5Kf5ro9PlEaOUmezwvEiiEotVuQg2e6heFMvFyuzkkURZLpUa5TRFcrVbLdBqtSZdbx9SZhsROLxeEqsIndOTHfcXYg3R6vfEfX6A+kgz70jQKoz-clvrEffGERt0z0UyqjGqM5rtTn9fhyDIAO74XCTaaVu5UmkIOueqqN33+wP5RBijtFZK95xhKKJdLhkKDwnl0dK8ccSfUTMzvUAORHeCcBQigYIQCwAEaYhuTrUjWO4xKGDZNkerYnggmShukzgwp6YbhHGLRSkOMrIj0AAiYDgTIQHEAM+ymLgbAkpQ9hyMSfSGFAkiBLAWDtDQGCLDgMxFM4zjQdWoCPOUMQhNE4QBuGNSXopQYwiUzjQvy-wfGUBGEfgMgQHAAQJp+egcXR+aHKIxwSVucGih2ISJN8vY+vhsRBryJSyf6nr3lEnypE+iLmTQACixbTIxK70cM5jHOxBjiPZzpSTyUSRGG-ZJLyUbhEGUKRM47lih8WXpFCoXDqRtDolB1wUpJQSIOUPoeuUolVOUmm8oyQaxuUNCiZG-zpKKmn4TVJHGsmb5pnV37ZnwaWwRlCBZd58Q0NeZRJGUUbpAhsKEWZAE0BRVE0VZByxcxrEroslnsGt26VO6bpFFV16Mj8hVoTUkT4Qhnrhsk-oJDNL5gG9cFZEGyTDRyHJJFEZQZBDzTNEAA */
    createMachine<Record<string, never>, UpdateNicknameMachineEvent>({
        id: 'Sign up',
        initial: 'Idle',
        states: {
            Idle: {
                on: {
                    'Validated sign up form': {
                        target: '#Sign up.Sending sign up to server',
                    },
                },
            },

            "Debouncing user's information fetching": {
                after: {
                    '300': {
                        target: '#Sign up.Idle',
                    },
                },
            },

            'Sending sign up to server': {
                invoke: {
                    src: 'Send sign up to server',
                },
            },
        },

        on: {
            'Signed up successfully': {
                actions: [
                    'Trigger sucess toast',
                    'Forward sign up success to appMachine',
                ],
                target: '#Sign up.Idle',
            },
            'Nickname unavailable': {
                actions: 'Set error state to nickname unavailable',
                target: '#Sign up.Idle',
            },
            'Email unavailable': {
                actions: 'Set error state to email unavailable',
                target: '#Sign up.Idle',
            },
            'Email invalid': {
                actions: 'Set error state to email is invalid',
                target: '#Sign up.Idle',
            },
            'Weak password': {
                actions: 'Set error state to password is weak',
                target: '#Sign up.Idle',
            },
            'Unknown error': {
                actions: ['Trigger unknown error toast'],
                target: '#Sign up.Idle',
            },
        },
    });

const AuthenticationSignUpFormScreen: React.FC<SignUpFormScreenProps> = ({
    navigation,
}) => {
    const {
        control,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<AuthenticationSignUpFormFormFieldValues>();

    const sx = useSx();

    const { appService } = useAppContext();
    const { send } = useInterpret(signUpMachine, {
        services: {
            'Send sign up to server': (_context, event) => async (sendBack) => {
                assertEventType(event, 'Validated sign up form');

                try {
                    await sendSignUp(event.body);

                    sendBack({
                        type: 'Signed up successfully',
                    });
                } catch (error) {
                    if (!(error instanceof SignUpError)) {
                        console.error(error);
                        sendBack({
                            type: 'Unknown error',
                        });
                        return;
                    }

                    error.signUpFailReasonCollection.forEach(
                        (signUpFailReason) => {
                            switch (signUpFailReason) {
                                case 'INVALID_EMAIL': {
                                    sendBack({
                                        type: 'Email invalid',
                                    });
                                    return;
                                }
                                case 'UNAVAILABLE_EMAIL': {
                                    sendBack({
                                        type: 'Email unavailable',
                                    });
                                    return;
                                }
                                case 'UNAVAILABLE_NICKNAME': {
                                    sendBack({
                                        type: 'Nickname unavailable',
                                    });
                                    return;
                                }
                                case 'WEAK_PASSWORD': {
                                    sendBack({
                                        type: 'Weak password',
                                    });
                                    return;
                                }
                                default: {
                                    sendBack({
                                        type: 'Unknown error',
                                    });
                                    return;
                                }
                            }
                        },
                    );
                }
            },
        },
        actions: {
            'Forward sign up success to appMachine': () => {
                appService.send({
                    type: 'SIGNED_UP_SUCCESSFULLY',
                });
            },

            'Trigger sucess toast': () => {
                Toast.show({
                    type: 'success',
                    text1: 'Signed up successfully',
                });
            },

            'Redirect back to previous screen': () => {
                navigation.goBack();
            },

            'Trigger unknown error toast': () => {
                Toast.show({
                    type: 'error',
                    text1: 'Something went wrong please try again later',
                });
            },

            'Set error state to password is weak': () => {
                setError('password', {
                    type: 'server error',
                    message: 'Password is too weak',
                });
            },

            'Set error state to email is invalid': () => {
                setError('email', {
                    type: 'server error',
                    message: 'Email is not valid',
                });
            },

            'Set error state to nickname unavailable': () => {
                setError('userNickname', {
                    type: 'server error',
                    message: 'Nickname is unavailable',
                });
            },

            'Set error state to email unavailable': () => {
                setError('email', {
                    type: 'server error',
                    message: 'Email is unavailable',
                });
            },
        },
    });

    function handleSigningInSubmit({
        email,
        password,
        userNickname,
    }: AuthenticationSignUpFormFormFieldValues) {
        console.log('submiting ');
        send({
            type: 'Validated sign up form',
            body: {
                userNickname,
                email,
                password,
            },
        });
    }

    return (
        <AppScreen testID="sign-up-form-screen-container">
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
                                To party sign up !
                            </Text>
                            <View
                                testID="sign-up-nickname-text-field"
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
                                    name="userNickname"
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
                                                placeholder="Your nickname"
                                                placeholderTextColor="#fff"
                                                sx={{
                                                    borderWidth: 1,
                                                    borderColor: 'greyLighter',
                                                }}
                                            />
                                        );
                                    }}
                                />

                                {errors.userNickname?.message && (
                                    <Text
                                        accessibilityRole="alert"
                                        sx={{
                                            color: 'red',
                                            marginTop: 's',
                                        }}
                                    >
                                        {errors.userNickname.message}
                                    </Text>
                                )}
                            </View>
                            <View
                                testID="sign-up-email-text-field"
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
                                    Email
                                </Text>

                                <Controller
                                    control={control}
                                    name="email"
                                    rules={{
                                        required: {
                                            value: true,
                                            message: 'This field is required',
                                        },
                                        validate: {
                                            isValidEmail: (email) => {
                                                const emailIsValid = z
                                                    .string()
                                                    .max(255)
                                                    .email()
                                                    .check(email);
                                                return (
                                                    emailIsValid ||
                                                    'Email is not valid'
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
                                                keyboardType={'email-address'}
                                                onChangeText={onChange}
                                                autoCompleteType={'email'}
                                                placeholder="Your email"
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
                                        sx={{
                                            color: 'red',
                                            marginTop: 's',
                                        }}
                                    >
                                        {errors.email.message}
                                    </Text>
                                )}
                            </View>

                            <View
                                testID="sign-up-password-text-field"
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
                                    rules={{
                                        required: {
                                            value: true,
                                            message: 'This field is required',
                                        },
                                        validate: {
                                            isValidPassword: (password) => {
                                                return (
                                                    passwordStrengthRegex.test(
                                                        password,
                                                    ) || 'Password is too weak'
                                                );
                                            },
                                        },
                                    }}
                                    render={({
                                        field: { onChange, onBlur, value },
                                    }) => {
                                        return (
                                            <TextField
                                                autoCompleteType={'password'}
                                                secureTextEntry={true}
                                                value={value}
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                placeholder="Your password"
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
                                        sx={{
                                            color: 'red',
                                            marginTop: 's',
                                        }}
                                    >
                                        {errors.password.message}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={handleSubmit(handleSigningInSubmit)}
                                testID="submit-sign-up-form-button"
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
                                    Sign Up
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </AppScreen>
    );
};

export default AuthenticationSignUpFormScreen;
