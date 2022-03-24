import { useSelector } from '@xstate/react';
import { SafeAreaView, Text, useSx, View } from 'dripsy';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import { AppScreen, TextField } from '../components/kit';
import SignOutButton from '../components/SignOutButton';
import { useAppContext } from '../contexts/AppContext';
import { EmailConfirmationScreenProps } from '../types';

interface EmailConfirmationFormFieldValues {
    code: string;
}

const EmailConfirmationScreen: React.FC<EmailConfirmationScreenProps> = () => {
    const sx = useSx();

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<EmailConfirmationFormFieldValues>({
        defaultValues: {
            code: '',
        },
    });

    const { appService } = useAppContext();
    const previousEmailConfirmationCodeWasInvalid = useSelector(
        appService,
        (state) => state.hasTag('previousEmailConfirmationCodeWasInvalid'),
    );
    const unknownErrorOccuredDuringPreviousSubmittingOfEmailConfirmationCode =
        useSelector(appService, (state) =>
            state.hasTag(
                'unknownErrorOccuredDuringPreviousSubmittingOfEmailConfirmationCode',
            ),
        );

    useEffect(() => {
        if (previousEmailConfirmationCodeWasInvalid === false) {
            return;
        }

        setError('code', {
            type: 'server',
            message: 'Code is invalid.',
        });
    }, [previousEmailConfirmationCodeWasInvalid, setError]);

    useEffect(() => {
        if (
            unknownErrorOccuredDuringPreviousSubmittingOfEmailConfirmationCode ===
            false
        ) {
            return;
        }

        setError('code', {
            type: 'server',
            message:
                'An error occured during submitting. Please try again later.',
        });
    }, [
        unknownErrorOccuredDuringPreviousSubmittingOfEmailConfirmationCode,
        setError,
    ]);

    function handleEmailConfirmationSubmit({
        code,
    }: EmailConfirmationFormFieldValues) {
        appService.send({
            type: 'SUBMIT_EMAIL_CONFIRMATION_FORM',
            code,
        });
    }

    return (
        <AppScreen testID="email-confirmation-screen-container">
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
                                Confirmation of your email address
                            </Text>

                            <Text
                                sx={{
                                    color: 'white',
                                    marginBottom: 'xl',
                                }}
                            >
                                You should have received an email containing a
                                code. Please fill the text field below with the
                                code.
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
                                                placeholder="Enter confirmation code..."
                                                placeholderTextColor="#fff"
                                                keyboardType="number-pad"
                                                sx={{
                                                    borderWidth: 1,
                                                    borderColor: 'greyLighter',
                                                }}
                                            />
                                        );
                                    }}
                                />

                                {errors.code?.message && (
                                    <Text
                                        accessibilityRole="alert"
                                        sx={{ color: 'red', marginTop: 's' }}
                                    >
                                        {errors.code.message}
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                testID="submit-email-verification-code-button"
                                onPress={handleSubmit(
                                    handleEmailConfirmationSubmit,
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
                                    Confirm my account
                                </Text>
                            </TouchableOpacity>

                            <View sx={{ marginTop: 'xxl' }}>
                                <Text sx={{ color: 'white' }}>
                                    Want to switch to another account?
                                </Text>
                            </View>

                            <SignOutButton />
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </AppScreen>
    );
};

export default EmailConfirmationScreen;
