import { useActor } from '@xstate/react';
import { View, Text, useSx } from 'dripsy';
import React from 'react';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { TextField } from '../components/kit';
import { useTextFieldStyles } from '../components/kit/TextField';
import MtvRoomCreationFormOptionButton from '../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { GOOGLE_PLACES_API_KEY } from '../constants/ApiKeys';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormPhysicalConstraintsScreenProps } from '../types';

const MusicTrackVoteCreationFormPhysicalConstraints: React.FC<
    MusicTrackVoteCreationFormPhysicalConstraintsScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ mtvRoomCreationActor }) => {
    const sx = useSx();
    const [state, send] = useActor(mtvRoomCreationActor);

    const hasPhysicalConstraints = state.hasTag('hasPhysicalConstraints');
    const physicalConstraintPlace = state.context.physicalConstraintPlace;
    const physicalConstraintRadius = state.context.physicalConstraintRadius;
    const physicalConstraintStartsAt = state.context.physicalConstraintStartsAt;
    const physicalConstraintEndsAt = state.context.physicalConstraintEndsAt;
    const physicalConstraintsOptions = [
        {
            text: 'Restrict',
            selected: hasPhysicalConstraints,
            onPress: handleSetPhysicalConstraintsStatus(true),
        },

        {
            text: 'No restriction',
            selected: state.hasTag('hasNoPhysicalConstraints'),
            onPress: handleSetPhysicalConstraintsStatus(false),
        },
    ];
    const placeInputStyles = useTextFieldStyles();

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
            title="Do you want to restrict voting right to physical constraints?"
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

                            <GooglePlacesAutocomplete
                                placeholder="Place"
                                onPress={(data, details = null) => {
                                    handlePhysicalConstraintPlaceChange(
                                        data.description,
                                    );
                                }}
                                query={{
                                    key: GOOGLE_PLACES_API_KEY,
                                    language: 'fr',
                                }}
                                requestUrl={{
                                    useOnPlatform: 'web',
                                    url: 'http://localhost:3333/proxy-places-api',
                                }}
                                styles={{
                                    container: {
                                        flex: 0,
                                        flexGrow: 1,
                                        flexShrink: 1,
                                    },

                                    textInput: [
                                        placeInputStyles,
                                        {
                                            height: null,
                                            paddingVertical: null,
                                            paddingHorizontal: null,
                                            marginBottom: null,
                                        },
                                        sx({
                                            marginTop: 'm',
                                        }),
                                    ],
                                }}
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
