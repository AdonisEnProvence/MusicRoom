import { Text, View } from 'dripsy';
import React from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { TextField } from '../../../components/kit';
import MtvRoomCreationFormScreen from '../../../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';

export interface MusicTrackVoteCreationFormNameFormFieldValues {
    roomName: string;
}

interface MusicTrackVoteCreationFormNameContentProps {
    defaultRoomName: string;
    handleGoBack: () => void;
    handleGoNext: SubmitHandler<MusicTrackVoteCreationFormNameFormFieldValues>;
}

const MusicPlaylistEditorCreationFormNameContent: React.FC<MusicTrackVoteCreationFormNameContentProps> =
    ({ defaultRoomName, handleGoBack, handleGoNext }) => {
        const {
            control,
            handleSubmit,
            formState: { errors },
        } = useForm<MusicTrackVoteCreationFormNameFormFieldValues>();

        return (
            <MtvRoomCreationFormScreen
                title="What is the name of the room?"
                onBackButtonPress={handleGoBack}
                onNextButtonPress={handleSubmit(handleGoNext)}
                Content={
                    <>
                        <View sx={{ marginTop: 'xl' }}>
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
                                        placeholder="Francis Cabrel OnlyFans"
                                        placeholderTextColor="#fff"
                                    />
                                )}
                                name="roomName"
                                defaultValue={defaultRoomName}
                            />
                            {errors.roomName && (
                                <Text
                                    accessibilityRole="alert"
                                    sx={{ color: 'red', marginTop: 's' }}
                                >
                                    A room name must be set.
                                </Text>
                            )}
                        </View>

                        <View
                            sx={{
                                marginTop: 'xl',
                                backgroundColor: 'greyLighter',
                                color: 'greyLight',
                                padding: 'm',
                                borderRadius: 's',
                            }}
                        >
                            <Text>This is an advice</Text>
                        </View>
                    </>
                }
            />
        );
    };

const MusicPlaylistEditorCreationFormName: React.FC = () => {
    return (
        <MusicPlaylistEditorCreationFormNameContent
            defaultRoomName="MPE"
            handleGoBack={() => {
                return undefined;
            }}
            handleGoNext={() => {
                return undefined;
            }}
        />
    );
};

const MusicPlaylistEditorCreationFormNameWrapper: React.FC = () => {
    return <MusicPlaylistEditorCreationFormName />;
};

export default MusicPlaylistEditorCreationFormNameWrapper;
