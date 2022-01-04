import { useSelector } from '@xstate/react';
import { Text, View } from 'dripsy';
import React from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { AppScreen, TextField } from '../../../components/kit';
import MtvRoomCreationFormScreen from '../../../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useMpeRoomCreationFormActor } from '../../../hooks/useMusicPlaylistsActor';
import { CreationMpeRoomFormActorRef } from '../../../machines/creationMpeRoomForm';

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

interface MusicPlaylistEditorCreationFormNameProps {
    creationFormActor: CreationMpeRoomFormActorRef;
}

const MusicPlaylistEditorCreationFormName: React.FC<MusicPlaylistEditorCreationFormNameProps> =
    ({ creationFormActor }) => {
        const defaultRoomName = useSelector(
            creationFormActor,
            (state) => state.context.roomName,
        );

        function handleGoBack() {
            creationFormActor.send({
                type: 'GO_BACK',
            });
        }

        function handleGoNext(roomName: string) {
            creationFormActor.send({
                type: 'SET_ROOM_NAME_AND_GO_NEXT',
                roomName,
            });
        }

        return (
            <MusicPlaylistEditorCreationFormNameContent
                defaultRoomName={defaultRoomName}
                handleGoBack={handleGoBack}
                handleGoNext={({ roomName }) => {
                    handleGoNext(roomName);
                }}
            />
        );
    };

const MusicPlaylistEditorCreationFormNameWrapper: React.FC = () => {
    const creationFormActor = useMpeRoomCreationFormActor();

    if (creationFormActor === undefined) {
        return (
            <AppScreen testID="music-playlist-editor-creation-form-name-screen-default" />
        );
    }

    return (
        <MusicPlaylistEditorCreationFormName
            creationFormActor={creationFormActor}
        />
    );
};

export default MusicPlaylistEditorCreationFormNameWrapper;
