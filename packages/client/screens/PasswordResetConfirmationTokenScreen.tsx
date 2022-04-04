import { useSelector } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    TextField,
} from '../components/kit';
import { useAppContext } from '../contexts/AppContext';
import { PasswordResetConfirmationTokenScreenProps } from '../types';

interface PasswordResetConfirmationTokenFormFieldValues {
    code: string;
}

const PasswordResetConfirmationTokenScreen: React.FC<PasswordResetConfirmationTokenScreenProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();
        const sx = useSx();

        const {
            control,
            handleSubmit,
            setError,
            formState: { errors },
        } = useForm<PasswordResetConfirmationTokenFormFieldValues>({
            defaultValues: {
                code: '',
            },
        });

        const { appService } = useAppContext();
        const passwordResetCodeIsInvalid = useSelector(appService, (state) =>
            state.hasTag('passwordResetCodeIsInvalid'),
        );

        useEffect(() => {
            if (passwordResetCodeIsInvalid === false) {
                return;
            }

            setError('code', {
                type: 'server',
                message: 'Code is invalid.',
            });
        }, [passwordResetCodeIsInvalid, setError]);

        function handlePasswordResetTokenSubmit({
            code,
        }: PasswordResetConfirmationTokenFormFieldValues) {
            appService.send({
                type: 'SUBMIT_PASSWORD_RESET_CONFIRMATION_FORM',
                code,
            });
        }

        function handleResendConfirmationEmail() {
            // TODO: Implement
        }

        return (
            <AppScreen testID="password-reset-confirmation-token-screen-container">
                <AppScreenHeader
                    title="Password reset"
                    insetTop={insets.top}
                    canGoBack={true}
                    goBack={() => {
                        navigation.goBack();
                    }}
                />

                <AppScreenContainer>
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
                                        marginBottom: 'xl',
                                    }}
                                >
                                    You should have received an email containing
                                    a code. Please fill the text field below
                                    with the code.
                                </Text>

                                <View
                                    testID="email-confirmation-screen-code-field"
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
                                        Confirmation code
                                    </Text>

                                    <Controller
                                        control={control}
                                        name="code"
                                        rules={{
                                            required: {
                                                value: true,
                                                message:
                                                    'This field is required',
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
                                                    placeholder="Enter confirmation code..."
                                                    placeholderTextColor="#fff"
                                                    keyboardType="number-pad"
                                                    sx={{
                                                        borderWidth: 1,
                                                        borderColor:
                                                            'greyLighter',
                                                    }}
                                                />
                                            );
                                        }}
                                    />

                                    {errors.code?.message && (
                                        <Text
                                            accessibilityRole="alert"
                                            sx={{
                                                color: 'red',
                                                marginTop: 's',
                                            }}
                                        >
                                            {errors.code.message}
                                        </Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    testID="submit-password-reset-code-button"
                                    onPress={handleSubmit(
                                        handlePasswordResetTokenSubmit,
                                    )}
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
                                        Submit
                                    </Text>
                                </TouchableOpacity>

                                <View sx={{ marginTop: 'xxl' }}>
                                    <Text sx={{ color: 'white' }}>
                                        You did not receive the confirmation
                                        email? Even in spam folder?
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={sx({
                                        marginTop: 'l',
                                        paddingX: 's',
                                        paddingY: 'm',
                                        backgroundColor: 'greyLighter',
                                        borderRadius: 's',
                                    })}
                                    onPress={handleResendConfirmationEmail}
                                >
                                    <Text
                                        sx={{
                                            color: 'greyLight',
                                            textAlign: 'center',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        Send a new code
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </AppScreenContainer>
            </AppScreen>
        );
    };

export default PasswordResetConfirmationTokenScreen;
