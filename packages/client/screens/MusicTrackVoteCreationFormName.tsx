import { useActor } from '@xstate/react';
import { Text, View } from 'dripsy';
import React from 'react';
import { useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { TextField } from '../components/kit';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormNameScreenProps } from '../types';

export interface MusicTrackVoteCreationFormNameFormFieldValues {
    roomName: string;
}

interface MusicTrackVoteCreationFormNameContentProps {
    defaultRoomName: string;
    handleGoBack: () => void;
    handleGoNext: SubmitHandler<MusicTrackVoteCreationFormNameFormFieldValues>;
}

export const MusicTrackVoteCreationFormNameContent: React.FC<MusicTrackVoteCreationFormNameContentProps> =
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

const MusicTrackVoteCreationFormName: React.FC<
    MusicTrackVoteCreationFormNameScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ navigation, mtvRoomCreationActor }) => {
    const [state, send] = useActor(mtvRoomCreationActor);
    const defaultRoomName = state.context.roomName;

    useEffect(() => {
        function closeModal() {
            navigation.popToTop();
            navigation.goBack();
        }

        send({
            type: 'FORWARD_MODAL_CLOSER',
            closeModal,
        });
    }, [send, navigation]);

    function handleGoBack() {
        send({
            type: 'GO_BACK',
        });
    }

    function handleRoomNameChange(roomName: string) {
        send({
            type: 'SET_ROOM_NAME',
            roomName,
        });
    }

    function handleGoNext() {
        send({
            type: 'NEXT',
        });
    }

    return (
        <MusicTrackVoteCreationFormNameContent
            defaultRoomName={defaultRoomName}
            handleGoBack={handleGoBack}
            handleGoNext={({ roomName }) => {
                handleRoomNameChange(roomName);

                handleGoNext();
            }}
        />
    );
};

const MusicTrackVoteCreationFormNameWrapper: React.FC<MusicTrackVoteCreationFormNameScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();

        if (mtvRoomCreationActor === undefined) {
            return null;
        }

        return (
            <MusicTrackVoteCreationFormName
                {...props}
                mtvRoomCreationActor={mtvRoomCreationActor}
            />
        );
    };

export default MusicTrackVoteCreationFormNameWrapper;
