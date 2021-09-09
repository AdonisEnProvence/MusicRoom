import { useActor } from '@xstate/react';
import { Text, View } from 'dripsy';
import React from 'react';
import { useEffect } from 'react';
import { TextField } from '../components/kit';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormNameScreenProps } from '../types';

const MusicTrackVoteCreationFormName: React.FC<
    MusicTrackVoteCreationFormNameScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ navigation, mtvRoomCreationActor }) => {
    const [state, send] = useActor(mtvRoomCreationActor);
    const currentRoomName = state.context.roomName;

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
            onNextButtonPress={handleGoNext}
            Content={
                <>
                    <View sx={{ marginTop: 'xl' }}>
                        <TextField
                            value={currentRoomName}
                            placeholder="Francis Cabrel OnlyFans"
                            onChangeText={handleRoomNameChange}
                        />
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
