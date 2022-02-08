import { Skeleton } from '@motify/skeleton';
import { GetMySettingsResponseBody } from '@musicroom/types';
import { useMachine } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React, { useMemo } from 'react';
import { Control, Controller, FieldErrors, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import invariant from 'tiny-invariant';
import { assign, createMachine, DoneInvokeEvent } from 'xstate';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    TextField,
} from '../../../components/kit';
import { assertEventType } from '../../../machines/utils';
import {
    getMySettings,
    setUserNickname,
} from '../../../services/UserSettingsService';
import { MySettingsUpdateNicknameScreenProps } from '../../../types';

export interface UpdateNicknameFormFieldValues {
    nickname: string;
}

interface UpdateNicknameMachineContext {
    mySettings: GetMySettingsResponseBody | undefined;
}

type UpdateNicknameMachineEvent =
    | { type: 'Validated form'; nickname: string }
    | { type: 'Updated nickname successfully' }
    | { type: "User's current nickname" }
    | { type: 'Nickname unavailable' }
    | { type: 'Unknown error' };

const updateNicknameMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QFUAOECGAXMACAdgJYDGA1vhgLZgB0AYmFsQBaH5S4CusYATgOSxcPLFjZRYAYggB7fLTYA3GaVppMOAiXJVaDJq3ZceAoSLHtYCJTOLZCcgNoAGALqJQqGbEJi5HkAAPRAA2ZwAmGgAWAA5nAE4Y+IBGKNSAVmSYgBoQAE9QmIBmGhCYgHYQ9PS0mPSw5IBfRtz1bDwiMgpqekYWcWM+QWFGCwlJPl4ZXhpUABtsADNpyho2zU6dHv1+o24hs1HxKxs7P3wXdyQQLx9zgOCESpiaROciorjwmPCQkPLcgUEEkSvUYnFPuVylEos1Wuh2louroaABJCBzMCSABqGDmhA0kFwy14lACt18DnwD0QNWcNGS8T+UWhyXS8Q5RUBiHi9I5zgq5VS4SKUQF6ThIHWHW03VoAGUwPgIANNnLcFgZCNeIo+JJpRAkVs8LBOMRiHBYItOHM5kDPN5Kf5ro9PlEaOUmezwvEiiEotVuQg2e6heFMvFyuzkkURZLpUa5TRFcrVbLdBqtSZdbx9SZhsROLxeEqsIndOTHfcXYg3R6vfEfX6A+kgz70jQKoz-clvrEffGERt0z0UyqjGqM5rtTn9fhyDIAO74XCTaaVu5UmkIOueqqN33+wP5RBijtFZK95xhKKJdLhkKDwnl0dK8ccSfUTMzvUAORHeCcBQigYIQCwAEaYhuTrUjWO4xKGDZNkerYnggmShukzgwp6YbhHGLRSkOMrIj0AAiYDgTIQHEAM+ymLgbAkpQ9hyMSfSGFAkiBLAWDtDQGCLDgMxFM4zjQdWoCPOUMQhNE4QBuGNSXopQYwiUzjQvy-wfGUBGEfgMgQHAAQJp+egcXR+aHKIxwSVucGih2ISJN8vY+vhsRBryJSyf6nr3lEnypE+iLmTQACixbTIxK70cM5jHOxBjiPZzpSTyUSRGG-ZJLyUbhEGUKRM47lih8WXpFCoXDqRtDolB1wUpJQSIOUPoeuUolVOUmm8oyQaxuUNCiZG-zpKKmn4TVJHGsmb5pnV37ZnwaWwRlCBZd58Q0NeZRJGUUbpAhsKEWZAE0BRVE0VZByxcxrEroslnsGt26VO6bpFFV16Mj8hVoTUkT4Qhnrhsk-oJDNL5gG9cFZEGyTDRyHJJFEZQZBDzTNEAA */
    createMachine<UpdateNicknameMachineContext, UpdateNicknameMachineEvent>({
        context: { mySettings: undefined },
        id: 'Update nickname',
        initial: "Fetching user's settings",
        states: {
            "Fetching user's settings": {
                invoke: {
                    src: "Fetch user's settings",
                    onDone: [
                        {
                            actions: "Assign user's settings to context",
                            target: "#Update nickname.Debouncing user's information fetching",
                        },
                    ],
                    onError: [
                        {
                            target: "#Update nickname.Error in user's settings fetching",
                        },
                    ],
                },
            },
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

type UpdateNicknameFormProps = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    control: Control<UpdateNicknameFormFieldValues, object>;
    errors: FieldErrors<UpdateNicknameFormFieldValues>;
    handleSubmit: () => void;
} & (
    | {
          status: 'loading';
      }
    | {
          status: 'success';
          mySettings: GetMySettingsResponseBody;
      }
    | {
          status: 'error';
      }
);

const UpdateNicknameForm: React.FC<UpdateNicknameFormProps> = (props) => {
    const sx = useSx();

    return (
        <View sx={{ flex: 1 }}>
            {props.status !== 'error' ? (
                <View
                    sx={{
                        marginBottom: 'm',
                    }}
                >
                    <Skeleton show={props.status === 'loading'} width="30%">
                        <Text
                            sx={{
                                color: 'greyLighter',
                                fontSize: 'xs',
                                fontWeight: 'bold',
                                textAlign: 'left',
                            }}
                        >
                            Nickname
                        </Text>
                    </Skeleton>
                </View>
            ) : null}

            <Skeleton width="100%">
                {props.status === 'success' ? (
                    <View>
                        <Controller
                            control={props.control}
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
                            defaultValue={props.mySettings.nickname}
                        />

                        {props.errors.nickname?.message && (
                            <Text
                                accessibilityRole="alert"
                                sx={{ color: 'red', marginTop: 's' }}
                            >
                                {props.errors.nickname.message}
                            </Text>
                        )}
                    </View>
                ) : props.status === 'error' ? (
                    <View>
                        <Text sx={{ color: 'white', fontSize: 'm' }}>
                            An error occured while fetching your settings.
                            Please try again later.
                        </Text>
                    </View>
                ) : undefined}
            </Skeleton>

            {props.status !== 'error' ? (
                <View
                    sx={{
                        marginTop: 'xl',
                    }}
                >
                    <Skeleton width="100%">
                        {props.status === 'success' ? (
                            <TouchableOpacity
                                onPress={props.handleSubmit}
                                style={sx({
                                    display: ['none', 'flex'],
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
                        ) : undefined}
                    </Skeleton>
                </View>
            ) : null}
        </View>
    );
};

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
    const [state, send] = useMachine(updateNicknameMachine, {
        services: {
            "Fetch user's settings":
                async (): Promise<GetMySettingsResponseBody> => {
                    const mySettings = await getMySettings();

                    return mySettings;
                },

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
            "Assign user's settings to context": assign({
                mySettings: (_context, e) => {
                    const event =
                        e as DoneInvokeEvent<GetMySettingsResponseBody>;

                    return event.data;
                },
            }),

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

    const formState = useMemo(() => {
        if (
            state.matches("Fetching user's settings") ||
            state.matches("Debouncing user's information fetching")
        ) {
            return {
                status: 'loading' as const,
            };
        }

        if (state.matches("Error in user's settings fetching")) {
            return {
                status: 'error' as const,
            };
        }

        invariant(
            state.context.mySettings !== undefined,
            "User's settings must have been set in this state",
        );

        return {
            status: 'success' as const,
            mySettings: state.context.mySettings,
        };
    }, [state]);

    function handleValidatedSubmit({
        nickname,
    }: UpdateNicknameFormFieldValues) {
        send({
            type: 'Validated form',
            nickname,
        });
    }

    return (
        <AppScreen testID="update-nickname-screen">
            <AppScreenHeader
                title="Update nickname"
                insetTop={insets.top}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
                HeaderRight={
                    formState.status === 'error'
                        ? undefined
                        : () => (
                              <TouchableOpacity
                                  onPress={handleSubmit(handleValidatedSubmit)}
                                  style={sx({
                                      display: ['flex', 'none'],
                                  })}
                              >
                                  <Text sx={{ color: 'greyLighter' }}>
                                      Edit
                                  </Text>
                              </TouchableOpacity>
                          )
                }
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
                    <UpdateNicknameForm
                        control={control}
                        errors={errors}
                        handleSubmit={handleSubmit(handleValidatedSubmit)}
                        {...formState}
                    />
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default UpdateNicknameScreen;
