import { Text, useSx, View } from 'dripsy';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    TextField,
} from '../../../components/kit';
import { MySettingsUpdateNicknameScreenProps } from '../../../types';

export interface UpdateNicknameFormFieldValues {
    nickname: string;
}

const UpdateNicknameScreen: React.FC<MySettingsUpdateNicknameScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<UpdateNicknameFormFieldValues>();

    function handleValidatedSubmit({
        nickname,
    }: UpdateNicknameFormFieldValues) {
        console.log('can update nickname', nickname);
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
                        <Text
                            sx={{ color: 'greyLighter', fontWeight: 'medium' }}
                        >
                            Edit
                        </Text>
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
                                textAlign: 'start',

                                marginBottom: 'm',
                            }}
                        >
                            Nickname
                        </Text>

                        <Controller
                            control={control}
                            rules={{
                                required: true,
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
                            defaultValue={'Devessier'}
                        />

                        {errors.nickname && (
                            <Text
                                accessibilityRole="alert"
                                sx={{ color: 'red', marginTop: 's' }}
                            >
                                A room name must be set.
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
