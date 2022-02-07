import { useInterpret } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { createMachine } from 'xstate';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    TextField,
} from '../../../components/kit';
import { assertEventType } from '../../../machines/utils';
import { setUserNickname } from '../../../services/UserSettingsService';
import { MySettingsUpdateNicknameScreenProps } from '../../../types';

export interface UpdateNicknameFormFieldValues {
    nickname: string;
}

type UpdateNicknameMachineEvent =
    | { type: 'Validated form'; nickname: string }
    | { type: 'Updated nickname successfully' }
    | { type: "User's current nickname" }
    | { type: 'Nickname unavailable' }
    | { type: 'Unknown error' };

const updateNicknameMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QFUAOECGAXMACAdgJYDGA1vhgLZgB0AkhADZgDEAaho4ZjhLgGYB7AE6VEoVINiEshQfnEgAHogAsADlU11AVgAMGgMyG9ew+oCMANgA0IAJ6IAnHppOX69YadWATDoszAHYAXxC7NB48IjIKahoAZTB8CEJ8KAIScio8LEFcWDBhADcilkjsSEzYnIKAV2JiOFh+OsZGRyQQSWlZeUUVBF8-GgsLINUgzUsLdSDbBzUgnRo9K3m9HR9VVUNQ8JAKnGrs+KSUtIyY09z8wpKygDksuLw6imKMQkYMACNmRQ9GRyBRdQaGMY0IJmJw7DTzZY6OydXzQ1amVQWXzjdSmdxhA74QQQOCKI7RF45ehMMCAqTA-pgxCWVyeHSIqwmZZOZGIXzuNzuQy+XGWHyo1RhCLoSonV6JZKpdJy2p5ApFUrCOm9EEDNS+XkIJwWUYTDTsjx6JwTKWHGXHa6vbUM0GgQazQ3jQXudRWAKWEWzXwEkJAA */
    createMachine<Record<string, never>, UpdateNicknameMachineEvent>({
        id: 'Update nickname',
        initial: 'Idle',
        states: {
            Idle: {
                on: {
                    'Validated form': {
                        target: '#Update nickname.Sending nickname to server',
                    },
                },
            },
            'Sending nickname to server': {
                invoke: {
                    src: 'Send nickname to server',
                },
                on: {
                    'Updated nickname successfully': {
                        actions: [
                            'Trigger sucess toast',
                            'Redirect back to previous screen',
                        ],
                        target: '#Update nickname.Idle',
                    },
                    "User's current nickname": {
                        actions: 'Set error state to nickname is current one',
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

const UpdateNicknameScreen: React.FC<MySettingsUpdateNicknameScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<UpdateNicknameFormFieldValues>();
    const updateNicknameService = useInterpret(updateNicknameMachine, {
        services: {
            'Send nickname to server':
                (_context, event) => async (sendBack) => {
                    assertEventType(event, 'Validated form');

                    try {
                        const { status } = await setUserNickname({
                            nickname: event.nickname,
                        });

                        switch (status) {
                            case 'SUCCESS': {
                                sendBack({
                                    type: 'Updated nickname successfully',
                                });

                                break;
                            }

                            case 'SAME_NICKNAME': {
                                sendBack({
                                    type: "User's current nickname",
                                });

                                break;
                            }

                            case 'UNAVAILABLE_NICKNAME': {
                                sendBack({
                                    type: 'Nickname unavailable',
                                });

                                break;
                            }

                            default: {
                                throw new Error('Received unknown status');
                            }
                        }
                    } catch {
                        sendBack({
                            type: 'Nickname unavailable',
                        });
                    }
                },
        },
        actions: {
            'Trigger sucess toast': () => {
                Toast.show({
                    type: 'success',
                    text1: 'Nickname updated successfully',
                });
            },

            'Redirect back to previous screen': () => {
                navigation.goBack();
            },

            'Set error state to nickname is current one': () => {
                setError('nickname', {
                    type: 'server error',
                    message: 'Nickname is not changed',
                });
            },

            'Set error state to unknown': () => {
                setError('nickname', {
                    type: 'server error',
                    message: 'An error occured',
                });
            },

            'Set error state to nickname unavailable': () => {
                setError('nickname', {
                    type: 'server error',
                    message: 'Nickname is unavailable',
                });
            },
        },
    });

    function handleValidatedSubmit({
        nickname,
    }: UpdateNicknameFormFieldValues) {
        updateNicknameService.send({
            type: 'Validated form',
            nickname,
        });
    }

    return (
        <AppScreen>
            <AppScreenHeader
                title="Update nickname"
                insetTop={insets.top}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
                HeaderRight={() => (
                    <TouchableOpacity
                        onPress={handleSubmit(handleValidatedSubmit)}
                        style={sx({
                            display: ['flex', 'none'],
                        })}
                    >
                        <Text sx={{ color: 'greyLighter' }}>Edit</Text>
                    </TouchableOpacity>
                )}
            />

            <AppScreenContainer>
                <View
                    sx={{
                        flex: 1,
                        paddingBottom: insets.bottom,
                        paddingLeft: 'l',
                        paddingRight: 'l',
                        maxWidth: [null, 420],
                        width: '100%',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                    }}
                >
                    <View>
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
                            rules={{
                                required: {
                                    value: true,
                                    message: 'Nickname is required',
                                },
                            }}
                            render={({
                                field: { onChange, onBlur, value },
                            }) => (
                                <TextField
                                    value={value}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    placeholder="Nickname"
                                    placeholderTextColor="#fff"
                                />
                            )}
                            name="nickname"
                            defaultValue="Devessier"
                        />

                        {errors.nickname?.message && (
                            <Text
                                accessibilityRole="alert"
                                sx={{ color: 'red', marginTop: 's' }}
                            >
                                {errors.nickname.message}
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        onPress={handleSubmit(handleValidatedSubmit)}
                        style={sx({
                            display: ['none', 'flex'],
                            marginTop: 'xl',
                            paddingX: 's',
                            paddingY: 'm',
                            backgroundColor: 'greyLight',
                            borderRadius: 's',
                        })}
                    >
                        <Text
                            sx={{
                                color: 'white',
                                textAlign: 'center',
                                fontWeight: 'bold',
                            }}
                        >
                            Submit
                        </Text>
                    </TouchableOpacity>
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default UpdateNicknameScreen;
