import { useActor } from '@xstate/react';
import { View, Text } from 'dripsy';
import React from 'react';
import { TextField } from '../components/kit';
import MtvRoomCreationFormOptionButton from '../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormPhysicalConstraintsScreenProps } from '../types';

const MusicTrackVoteCreationFormPhysicalConstraints: React.FC<
    MusicTrackVoteCreationFormPhysicalConstraintsScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ mtvRoomCreationActor }) => {
    const [state, send] = useActor(mtvRoomCreationActor);

    const hasPhysicalConstraints = state.hasTag('hasPhysicalConstraints');
    const physicalConstraintPlace = state.context.physicalConstraintPlace;
    const physicalConstraintRadius = state.context.physicalConstraintRadius;
    const physicalConstraintStartsAt = state.context.physicalConstraintStartsAt;
    const physicalConstraintEndsAt = state.context.physicalConstraintEndsAt;
    const physicalConstraintsOptions = [
        {
            text: 'No restriction',
            selected: hasPhysicalConstraints,
            onPress: handleSetPhysicalConstraintsStatus(true),
        },

        {
            text: 'Restrict',
            selected: state.hasTag('hasNoPhysicalConstraints'),
            onPress: handleSetPhysicalConstraintsStatus(false),
        },
    ];

    function handleSetPhysicalConstraintsStatus(isRestricted: boolean) {
        return () => {
            send({
                type: 'SET_PHYSICAL_CONSTRAINTS_STATUS',
                isRestricted,
            });
        };
    }

    function handlePhysicalConstraintPlaceChange(place: string) {
        send({
            type: 'SET_PHYSICAL_CONSTRAINT_PLACE',
            place,
        });
    }

    function handlePhysicalConstraintRadiusChange(radius: string) {
        send({
            type: 'SET_PHYSICAL_CONSTRAINT_RADIUS',
            radius: Number(radius),
        });
    }

    function handlePhysicalConstraintStartsAtChange(startsAt: string) {
        send({
            type: 'SET_PHYSICAL_CONSTRAINT_STARTS_AT',
            startsAt,
        });
    }

    function handlePhysicalConstraintEndsAtChange(endsAt: string) {
        send({
            type: 'SET_PHYSICAL_CONSTRAINT_ENDS_AT',
            endsAt,
        });
    }

    function handleGoBack() {
        send({
            type: 'GO_BACK',
        });
    }

    function handleGoNext() {
        send({
            type: 'NEXT',
        });
    }

    return (
        <MtvRoomCreationFormScreen
            title="Do you want to restrict voting right to physical contraints?"
            onBackButtonPress={handleGoBack}
            onNextButtonPress={handleGoNext}
            Content={
                <>
                    <View
                        sx={{
                            marginTop: 'xl',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        {physicalConstraintsOptions.map(
                            ({ text, selected, onPress }, index) => {
                                const isNotLastButton =
                                    index <
                                    physicalConstraintsOptions.length - 1;

                                return (
                                    <MtvRoomCreationFormOptionButton
                                        key={text}
                                        text={text}
                                        isSelected={selected}
                                        onPress={onPress}
                                        shouldApplyRightMargin={isNotLastButton}
                                    />
                                );
                            },
                        )}
                    </View>

                    {hasPhysicalConstraints && (
                        <View
                            sx={{
                                paddingTop: 'xl',
                            }}
                        >
                            <Text sx={{ color: 'greyLighter' }}>
                                Select the constraints you want
                            </Text>

                            <TextField
                                value={physicalConstraintPlace}
                                placeholder="Place"
                                onChangeText={
                                    handlePhysicalConstraintPlaceChange
                                }
                                sx={{ marginTop: 'm' }}
                            />

                            <TextField
                                value={String(physicalConstraintRadius)}
                                placeholder="Radius"
                                onChangeText={
                                    handlePhysicalConstraintRadiusChange
                                }
                                sx={{ marginTop: 'm' }}
                            />

                            <TextField
                                value={physicalConstraintStartsAt}
                                placeholder="Starts at"
                                onChangeText={
                                    handlePhysicalConstraintStartsAtChange
                                }
                                sx={{ marginTop: 'm' }}
                            />

                            <TextField
                                value={physicalConstraintEndsAt}
                                placeholder="Ends at"
                                onChangeText={
                                    handlePhysicalConstraintEndsAtChange
                                }
                                sx={{ marginTop: 'm' }}
                            />
                        </View>
                    )}
                </>
            }
        />
    );
};

const MusicTrackVoteCreationFormPhysicalConstraintsWrapper: React.FC<MusicTrackVoteCreationFormPhysicalConstraintsScreenProps> =
    (props) => {
        const mtvRoomCreationActor = useCreationMtvRoomFormMachine();

        if (mtvRoomCreationActor === undefined) {
            return null;
        }

        return (
            <MusicTrackVoteCreationFormPhysicalConstraints
                {...props}
                mtvRoomCreationActor={mtvRoomCreationActor}
            />
        );
    };

export default MusicTrackVoteCreationFormPhysicalConstraintsWrapper;
