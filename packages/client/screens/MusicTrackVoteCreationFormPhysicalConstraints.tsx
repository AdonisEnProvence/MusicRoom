import { useActor } from '@xstate/react';
import { View, Text, Button, useSx } from 'dripsy';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import React, { useState } from 'react';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import PickerSelect from 'react-native-picker-select';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { TextField } from '../components/kit';
import { useTextFieldStyles } from '../components/kit/TextField';
import MtvRoomCreationFormOptionButton from '../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { GOOGLE_PLACES_API_KEY } from '../constants/ApiKeys';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormPhysicalConstraintsScreenProps } from '../types';
import { TouchableOpacity } from 'react-native';

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
    const physicalConstraintStartsAtFormatted = format(
        physicalConstraintStartsAt,
        'Pp',
        {
            locale: enUS,
        },
    );
    const physicalConstraintEndsAt = state.context.physicalConstraintEndsAt;
    const physicalConstraintEndsAtFormatted = format(
        physicalConstraintEndsAt,
        'Pp',
        {
            locale: enUS,
        },
    );
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

    function handlePhysicalConstraintStartsAtChange(startsAt: Date) {
        send({
            type: 'SET_PHYSICAL_CONSTRAINT_STARTS_AT',
            startsAt,
        });
        hideStartsAtDatePicker();
    }

    function handlePhysicalConstraintEndsAtChange(endsAt: Date) {
        send({
            type: 'SET_PHYSICAL_CONSTRAINT_ENDS_AT',
            endsAt,
        });
        hideEndsAtDatePicker();
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

    const [isStartsAtDatePickerVisible, setStartsAtDatePickerVisibility] =
        useState(false);

    const showStartsAtDatePicker = () => {
        setStartsAtDatePickerVisibility(true);
    };

    const hideStartsAtDatePicker = () => {
        setStartsAtDatePickerVisibility(false);
    };

    const [isEndsAtDatePickerVisible, setEndsAtDatePickerVisibility] =
        useState(false);

    const showEndsAtDatePicker = () => {
        setEndsAtDatePickerVisibility(true);
    };

    const hideEndsAtDatePicker = () => {
        setEndsAtDatePickerVisibility(false);
    };

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
                                textInputProps={{
                                    placeholderTextColor: 'white',
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

                            <PickerSelect
                                placeholder={{
                                    label: 'Radius',
                                    value: null,
                                    color: '#9EA0A4',
                                }}
                                items={[
                                    {
                                        key: '30',
                                        label: '30',
                                        value: 30,
                                    },
                                    {
                                        key: '50',
                                        label: '50',
                                        value: 50,
                                    },
                                    {
                                        key: '70',
                                        label: '70',
                                        value: 70,
                                    },
                                ]}
                                value={physicalConstraintRadius}
                                onValueChange={
                                    handlePhysicalConstraintRadiusChange
                                }
                                useNativeAndroidPickerStyle={false}
                                style={
                                    {
                                        inputIOS: [
                                            sx({
                                                marginTop: 'm',
                                                paddingRight: 'xl',
                                            }),
                                            placeInputStyles,
                                        ],

                                        inputAndroid: [
                                            sx({
                                                marginTop: 'm',
                                                paddingRight: 'xl',
                                            }),
                                            placeInputStyles,
                                        ],

                                        inputWeb: [
                                            sx({
                                                marginTop: 'm',
                                                paddingRight: 'xl',
                                            }),
                                            placeInputStyles,
                                        ],
                                    } as any
                                }
                            />

                            <TouchableOpacity
                                onPress={showStartsAtDatePicker}
                                style={[
                                    placeInputStyles,
                                    sx({
                                        marginTop: 'm',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                    }),
                                ]}
                            >
                                <Text sx={{ color: 'white', fontSize: 's' }}>
                                    Starts at
                                </Text>

                                <Text sx={{ color: 'white', fontSize: 's' }}>
                                    {physicalConstraintStartsAtFormatted}
                                </Text>
                            </TouchableOpacity>

                            <DateTimePickerModal
                                isVisible={isStartsAtDatePickerVisible}
                                mode="datetime"
                                onConfirm={
                                    handlePhysicalConstraintStartsAtChange
                                }
                                onCancel={hideStartsAtDatePicker}
                            />

                            <TouchableOpacity
                                onPress={showEndsAtDatePicker}
                                style={[
                                    placeInputStyles,
                                    sx({
                                        marginTop: 'm',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                    }),
                                ]}
                            >
                                <Text sx={{ color: 'white', fontSize: 's' }}>
                                    Ends at
                                </Text>

                                <Text sx={{ color: 'white', fontSize: 's' }}>
                                    {physicalConstraintEndsAtFormatted}
                                </Text>
                            </TouchableOpacity>

                            <DateTimePickerModal
                                isVisible={isEndsAtDatePickerVisible}
                                mode="datetime"
                                onConfirm={handlePhysicalConstraintEndsAtChange}
                                onCancel={hideEndsAtDatePicker}
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
