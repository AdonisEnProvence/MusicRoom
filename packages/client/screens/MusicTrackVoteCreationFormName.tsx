import { useActor } from '@xstate/react';
import { Text, View } from 'dripsy';
import React from 'react';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { TextField } from '../components/kit';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormNameScreenProps } from '../types';

interface FormFieldValues {
    roomName: string;
}

const MusicTrackVoteCreationFormName: React.FC<
    MusicTrackVoteCreationFormNameScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ navigation, mtvRoomCreationActor }) => {
    const [state, send] = useActor(mtvRoomCreationActor);
    const defaultRoomName = state.context.roomName;
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<FormFieldValues>();

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
        <MtvRoomCreationFormScreen
            title="What is the name of the room?"
            onBackButtonPress={handleGoBack}
            onNextButtonPress={handleSubmit(({ roomName }) => {
                handleRoomNameChange(roomName);

                handleGoNext();
            })}
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
                            <Text sx={{ color: 'red', marginTop: 's' }}>
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
