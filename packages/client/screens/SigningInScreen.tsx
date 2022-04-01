import { useSelector } from '@xstate/react';
import { Button, SafeAreaView, Text, useSx, View } from 'dripsy';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import invariant from 'tiny-invariant';
import * as z from 'zod';
import { AppScreen, TextField } from '../components/kit';
import { useAppContext } from '../contexts/AppContext';
import { sendAuthenticateWithGoogleAccount } from '../services/AuthenticationService';
import { SigningInScreenProps } from '../types';

WebBrowser.maybeCompleteAuthSession();

interface SigningInFormFieldValues {
    email: string;
    password: string;
}

const SigningInScreen: React.FC<SigningInScreenProps> = ({ navigation }) => {
    const [accessToken, setAccessToken] = useState<string | undefined>(
        undefined,
    );
    const [request, response, promptAsync] = Google.useAuthRequest({
        expoClientId:
            '326703248925-qg0i9ig0b4gqvkpmpfd665d5un082adj.apps.googleusercontent.com',
        iosClientId:
            '326703248925-n6knfko9tffasgpq3ffbv8i8qj7vpcgg.apps.googleusercontent.com',
        androidClientId:
            '326703248925-fq6r2lio64q1fg0ap6hj6uvm09raf9cd.apps.googleusercontent.com',
        webClientId:
            '326703248925-sn4nvaq3vkjoc1chuju6binov8ha3jl3.apps.googleusercontent.com',
    });
    //   protected userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo'
    async function getUserData() {
        if (accessToken) {
            const userInfoResponse = await fetch(
                'https://www.googleapis.com/userinfo/v2/me',
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                },
            );

            const infos = await userInfoResponse.json();
            console.log({ infos });
        } else {
            console.log('no access token');
        }
    }

    const sx = useSx();
    const { appService } = useAppContext();
    const {
        control,
        handleSubmit,
        getValues,
        trigger,
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

    async function handleRequestPasswordReset() {
        const isEmailValid = await trigger('email');
        const isEmailInvalid = isEmailValid === false;
        if (isEmailInvalid === true) {
            return;
        }

        const { email } = getValues();

        appService.send({
            type: 'REQUEST_PASSWORD_RESET',
            email,
        });
    }

    React.useEffect(() => {
        console.log({ response });
        if (response?.type === 'success') {
            const { authentication } = response;
            console.log({ authentication });
            invariant(authentication !== null, 'authentication is undefined');
            setAccessToken(authentication.accessToken);
            void sendAuthenticateWithGoogleAccount({
                userGoogleAccessToken: authentication.accessToken,
            });
        }
    }, [response]);

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
                                                        .safeParse(email)
                                                        .success ||
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

                                <TouchableOpacity
                                    style={sx({
                                        marginTop: 'm',
                                    })}
                                    onPress={handleRequestPasswordReset}
                                >
                                    <Text sx={{ color: 'white' }}>
                                        Do you lost your password?
                                    </Text>
                                </TouchableOpacity>

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

                            <Button
                                disabled={!request}
                                title="Login"
                                onPress={async () => {
                                    await promptAsync();
                                }}
                            />

                            <Button
                                title={'Get User Data'}
                                onPress={getUserData}
                            />

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
