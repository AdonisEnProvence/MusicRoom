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
import { PasswordResetFinalScreenProps } from '../types';

interface PasswordResetFinalFormFieldValues {
    password: string;
}

const PasswordResetFinalScreen: React.FC<PasswordResetFinalScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<PasswordResetFinalFormFieldValues>({
        defaultValues: {
            password: '',
        },
    });

    const { appService } = useAppContext();
    const passwordResetCodeIsInvalid = useSelector(appService, (state) =>
        state.hasTag('passwordResetCodeIsInvalid'),
    );

    // useEffect(() => {
    //     if (passwordResetCodeIsInvalid === false) {
    //         return;
    //     }

    //     setError('code', {
    //         type: 'server',
    //         message: 'Code is invalid.',
    //     });
    // }, [passwordResetCodeIsInvalid, setError]);

    function handlePasswordResetSubmit({
        password,
    }: PasswordResetFinalFormFieldValues) {
        // TODO: to implement
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
                                Please enter your new password. You will be
                                logged in immediately after submitting the form.
                            </Text>

                            <View
                                testID="password-reset-confirmation-code-field"
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
                                    New password
                                </Text>

                                <Controller
                                    control={control}
                                    name="password"
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
                                                placeholder="Enter new password..."
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
                                testID="submit-password-reset-code-button"
                                onPress={handleSubmit(
                                    handlePasswordResetSubmit,
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
                        </View>
                    </View>
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default PasswordResetFinalScreen;
