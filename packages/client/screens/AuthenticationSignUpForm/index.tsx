import { SafeAreaView, Text, useSx, View } from 'dripsy';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import * as z from 'zod';
import { createMachine } from 'xstate';
import { useMachine } from '@xstate/react';
import Toast from 'react-native-toast-message';
import { assertEventType } from '../../machines/utils';
import { AppScreen, TextField } from '../../components/kit';
import {
    sendWebAuthSignUp,
    SignUpError,
} from '../../services/AuthenticationService';
import { SignUpFormScreenProps } from '../../types';

export interface AuthenticationSignUpFormFormFieldValues {
    userNickname: string;
    password: string;
    email: string;
}

const passwordStrengthRegex = new RegExp(
    /^(?=.*[A-Z].*[A-Z])(?=.*[!#$:@+%&'*+/\\=?^_`{|}~-])(?=.*[0-9].*[0-9])(?=.*[a-z].*[a-z].*[a-z]).{8,}$/,
);

type UpdateNicknameMachineEvent =
    | { type: 'Validated form'; body: AuthenticationSignUpFormFormFieldValues }
    | { type: 'Signed up successfully' }
    | { type: 'Nickname unavailable' }
    | { type: 'Email unavailable' }
    | { type: 'Email invalid' }
    | { type: 'Weak password' }
    | { type: 'Unknown error' };

const updateNicknameMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QFUAOECGAXMACAdgJYDGA1vhgLZgB0AYmFsQBaH5S4CusYATgOSxcPLFjZRYAYggB7fLTYA3GaVppMOAiXJVaDJq3ZceAoSLHtYCJTOLZCcgNoAGALqJQqGbEJi5HkAAPRAA2ZwAmGgAWAA5nAE4Y+IBGKNSAVmSYgBoQAE9QmIBmGhCYgHYQ9PS0mPSw5IBfRtz1bDwiMgpqekYWcWM+QWFGCwlJPl4ZXhpUABtsADNpyho2zU6dHv1+o24hs1HxKxs7P3wXdyQQLx9zgOCESpiaROciorjwmPCQkPLcgUEEkSvUYnFPuVylEos1Wuh2louroaABJCBzMCSABqGDmhA0kFwy14lACt18DnwD0QNWcNGS8T+UWhyXS8Q5RUBiHi9I5zgq5VS4SKUQF6ThIHWHW03VoAGUwPgIANNnLcFgZCNeIo+JJpRAkVs8LBOMRiHBYItOHM5kDPN5Kf5ro9PlEaOUmezwvEiiEotVuQg2e6heFMvFyuzkkURZLpUa5TRFcrVbLdBqtSZdbx9SZhsROLxeEqsIndOTHfcXYg3R6vfEfX6A+kgz70jQKoz-clvrEffGERt0z0UyqjGqM5rtTn9fhyDIAO74XCTaaVu5UmkIOueqqN33+wP5RBijtFZK95xhKKJdLhkKDwnl0dK8ccSfUTMzvUAORHeCcBQigYIQCwAEaYhuTrUjWO4xKGDZNkerYnggmShukzgwp6YbhHGLRSkOMrIj0AAiYDgTIQHEAM+ymLgbAkpQ9hyMSfSGFAkiBLAWDtDQGCLDgMxFM4zjQdWoCPOUMQhNE4QBuGNSXopQYwiUzjQvy-wfGUBGEfgMgQHAAQJp+egcXR+aHKIxwSVucGih2ISJN8vY+vhsRBryJSyf6nr3lEnypE+iLmTQACixbTIxK70cM5jHOxBjiPZzpSTyUSRGG-ZJLyUbhEGUKRM47lih8WXpFCoXDqRtDolB1wUpJQSIOUPoeuUolVOUmm8oyQaxuUNCiZG-zpKKmn4TVJHGsmb5pnV37ZnwaWwRlCBZd58Q0NeZRJGUUbpAhsKEWZAE0BRVE0VZByxcxrEroslnsGt26VO6bpFFV16Mj8hVoTUkT4Qhnrhsk-oJDNL5gG9cFZEGyTDRyHJJFEZQZBDzTNEAA */
    createMachine<Record<string, never>, UpdateNicknameMachineEvent>({
        id: 'Update nickname',
        initial: 'idle',
        states: {
            idle: {},

            "Error in user's settings fetching": {
                type: 'final',
            },
            "Debouncing user's information fetching": {
                after: {
                    '300': {
                        target: '#Update nickname.Idle',
                    },
                },
            },
            Idle: {
                on: {
                    'Validated form': {
                        target: '#Update nickname.Sending sign up to server',
                    },
                },
            },
            'Sending sign up to server': {
                invoke: {
                    src: 'Send sign up to server',
                },
                on: {
                    'Signed up successfully': {
                        actions: ['Trigger sucess toast', 'Reset forms errors'],
                        target: '#Update nickname.Idle',
                    },
                    'Unknown error': {
                        actions: 'Set error state to unknown',
                        target: '#Update nickname.Idle',
                    },
                    'Nickname unavailable': {
                        actions: 'Set error state to nickname unavailable',
                        target: '#Update nickname.Idle',
                    },
                },
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
    // const { appService } = useAppContext();
    function handleSigningInSubmit({
        email,
        password,
        userNickname,
    }: AuthenticationSignUpFormFormFieldValues) {
        // appService.send({
        //     type: 'SIGN_IN',
        //     email,
        //     password,
        // });
    }

    const [state, send] = useMachine(updateNicknameMachine, {
        services: {
            'Send sign up to server': (_context, event) => async (sendBack) => {
                assertEventType(event, 'Validated form');

                try {
                    const { status } = await sendWebAuthSignUp(event.body);

                    sendBack({
                        type: 'Signed up successfully',
                    });
                } catch (error) {
                    const isNotSignUpError = !(error instanceof SignUpError);

                    if (isNotSignUpError) {
                        console.error(error);
                        sendBack({
                            type: 'Unknown error',
                        });
                        return;
                    }

                    switch (error.signUpFailReason) {
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
                }
            },
        },
        actions: {
            'Trigger sucess toast': () => {
                Toast.show({
                    type: 'success',
                    text1: 'Signed up successfully',
                });
            },

            'Redirect back to previous screen': () => {
                navigation.goBack();
            },

            'Set error state to unknown': () => {
                setError('userNickname', {
                    type: 'server error',
                    message: 'An error occured',
                });
            },

            'Set error state to nickname unavailable': () => {
                setError('userNickname', {
                    type: 'server error',
                    message: 'Nickname is unavailable',
                });
            },

            'Set error state to email unavailable': () => {
                setError('userNickname', {
                    type: 'server error',
                    message: 'Nickname is unavailable',
                });
            },
        },
    });

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
                                To party sign up !
                            </Text>

                            <View sx={{ marginBottom: 'xl' }}>
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
                                    defaultValue="prastoin"
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
                                                placeholder="Your Nickname"
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

                            <View sx={{ marginBottom: 'xl' }}>
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
                                        sx={{
                                            color: 'red',
                                            marginTop: 's',
                                        }}
                                    >
                                        {errors.email.message}
                                    </Text>
                                )}
                            </View>

                            <View sx={{ marginBottom: 'xl' }}>
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

export default AuthenticationSignUpFormScreen;
