import { useActor } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React from 'react';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import PickerSelect from 'react-native-picker-select';
import urlcat from 'urlcat';
import { useTextFieldStyles } from '../components/kit/TextField';
import MtvRoomCreationFormDatePicker from '../components/MtvRoomCreationForm/MtvRoomCreationFormDatePicker';
import MtvRoomCreationFormOptionButton from '../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { GOOGLE_PLACES_API_KEY } from '../constants/ApiKeys';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { useCreationMtvRoomFormMachine } from '../contexts/MusicPlayerContext';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormPhysicalConstraintsScreenProps } from '../types';
import { Controller, useForm } from 'react-hook-form';
import { isAfter, isFuture } from 'date-fns';

interface FormFieldValues {
    place: { id: string; label: string };
    radius: number;
    startsAt: Date | undefined;
    endsAt: Date | undefined;
}

const MusicTrackVoteCreationFormPhysicalConstraints: React.FC<
    MusicTrackVoteCreationFormPhysicalConstraintsScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ mtvRoomCreationActor }) => {
    const PLACES_API_PROXY_URL = urlcat(SERVER_ENDPOINT, '/proxy-places-api');

    const sx = useSx();
    const [state, send] = useActor(mtvRoomCreationActor);
    const {
        control,
        handleSubmit,
        getValues,
        formState: { errors },
    } = useForm<FormFieldValues>();

    const hasPhysicalConstraints = state.hasTag('hasPhysicalConstraints');
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
    const textFieldStyles = useTextFieldStyles();

    function handleSetPhysicalConstraintsStatus(isRestricted: boolean) {
        return () => {
            send({
                type: 'SET_PHYSICAL_CONSTRAINTS_STATUS',
                isRestricted,
            });
        };
    }

    function handlePhysicalConstraintPlaceChange(
        placeID: string,
        place: string,
    ) {
        send({
            type: 'SET_PHYSICAL_CONSTRAINT_PLACE',
            place,
            placeID,
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
    }

    function handlePhysicalConstraintEndsAtChange(endsAt: Date) {
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
            onNextButtonPress={handleSubmit(
                ({ place, radius, startsAt, endsAt }) => {
                    if (place !== undefined) {
                        handlePhysicalConstraintPlaceChange(
                            place.id,
                            place.label,
                        );
                    }

                    handlePhysicalConstraintRadiusChange(String(radius));

                    if (startsAt !== undefined) {
                        handlePhysicalConstraintStartsAtChange(startsAt);
                    }
                    if (endsAt !== undefined) {
                        handlePhysicalConstraintEndsAtChange(endsAt);
                    }

                    handleGoNext();
                },
            )}
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

                            <Controller
                                control={control}
                                rules={{
                                    required: true,
                                }}
                                render={({
                                    field: { onChange, onBlur, value },
                                }) => (
                                    <GooglePlacesAutocomplete
                                        placeholder="Place"
                                        onPress={(data, details = null) => {
                                            // handlePhysicalConstraintPlaceChange(
                                            //     data.description,
                                            // );

                                            onChange({
                                                id: data.place_id,
                                                label: data.description,
                                            });
                                            onBlur();
                                        }}
                                        query={{
                                            key: GOOGLE_PLACES_API_KEY,
                                            language: 'fr',
                                        }}
                                        requestUrl={{
                                            useOnPlatform: 'all',
                                            url: PLACES_API_PROXY_URL,
                                        }}
                                        textInputProps={{
                                            placeholderTextColor: 'white',
                                        }}
                                        styles={{
                                            container: {
                                                flex: undefined,
                                                flexGrow: 1,
                                                flexShrink: 1,
                                            },

                                            textInput: [
                                                textFieldStyles,
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
                                )}
                                name="place"
                                defaultValue={undefined}
                            />
                            {errors.place && (
                                <Text sx={{ color: 'red', marginTop: 's' }}>
                                    A place must be set.
                                </Text>
                            )}

                            <Controller
                                control={control}
                                rules={{
                                    required: true,
                                }}
                                render={({ field: { onChange, value } }) => {
                                    console.log('value', value);

                                    return (
                                        <PickerSelect
                                            placeholder={{
                                                label: 'Radius',
                                                value: undefined,
                                                color: '#9EA0A4',
                                            }}
                                            items={[
                                                {
                                                    key: '30',
                                                    label: '30',
                                                    value: '30',
                                                },
                                                {
                                                    key: '50',
                                                    label: '50',
                                                    value: '50',
                                                },
                                                {
                                                    key: '70',
                                                    label: '70',
                                                    value: '70',
                                                },
                                            ]}
                                            value={value}
                                            onValueChange={(radius) => {
                                                if (radius === undefined) {
                                                    return;
                                                }

                                                const availableRadii = [
                                                    '30',
                                                    '50',
                                                    '70',
                                                ];
                                                if (
                                                    availableRadii.includes(
                                                        radius,
                                                    )
                                                ) {
                                                    onChange(radius);

                                                    return;
                                                }

                                                onChange(undefined);
                                            }}
                                            // onClose={onBlur}
                                            useNativeAndroidPickerStyle={false}
                                            style={
                                                {
                                                    inputIOS: [
                                                        sx({
                                                            marginTop: 'm',
                                                            paddingRight: 'xl',
                                                        }),
                                                        textFieldStyles,
                                                    ],

                                                    inputAndroid: [
                                                        sx({
                                                            marginTop: 'm',
                                                            paddingRight: 'xl',
                                                        }),
                                                        textFieldStyles,
                                                    ],

                                                    inputWeb: [
                                                        sx({
                                                            marginTop: 'm',
                                                            paddingRight: 'xl',
                                                        }),
                                                        textFieldStyles,
                                                    ],
                                                } as any
                                            }
                                        />
                                    );
                                }}
                                name="radius"
                                defaultValue={undefined}
                            />
                            {errors.radius && (
                                <Text sx={{ color: 'red', marginTop: 's' }}>
                                    A radius must be set.
                                </Text>
                            )}

                            <View sx={{ marginTop: 'm' }}>
                                <Controller
                                    control={control}
                                    rules={{
                                        validate: {
                                            isRequired: (startsAt) => {
                                                return (
                                                    startsAt !== undefined ||
                                                    'The start date is required.'
                                                );
                                            },

                                            isFuture: (startsAt) => {
                                                if (startsAt === undefined) {
                                                    return false;
                                                }

                                                return (
                                                    isFuture(startsAt) ||
                                                    'The event should start at a future date.'
                                                );
                                            },
                                        },
                                    }}
                                    render={({
                                        field: { onChange, value },
                                    }) => (
                                        <MtvRoomCreationFormDatePicker
                                            date={value}
                                            minimiumDate={new Date()}
                                            title="Starts at"
                                            onConfirm={onChange}
                                            testID="starts-at-datetime-picker"
                                        />
                                    )}
                                    name="startsAt"
                                    defaultValue={physicalConstraintStartsAt}
                                />
                                {errors.startsAt && (
                                    <Text sx={{ color: 'red', marginTop: 's' }}>
                                        {errors.startsAt.message}
                                    </Text>
                                )}
                            </View>

                            <View sx={{ marginTop: 'm' }}>
                                <Controller
                                    control={control}
                                    rules={{
                                        validate: {
                                            isRequired: (endsAt) => {
                                                return (
                                                    endsAt !== undefined ||
                                                    'The end date is required.'
                                                );
                                            },

                                            isAfterStartsAt: (endsAt) => {
                                                const startsAt =
                                                    getValues('startsAt');

                                                if (
                                                    endsAt === undefined ||
                                                    startsAt === undefined
                                                ) {
                                                    return false;
                                                }

                                                return (
                                                    isAfter(endsAt, startsAt) ||
                                                    'The event end date must be after its beginning.'
                                                );
                                            },
                                        },
                                    }}
                                    render={({
                                        field: { onChange, value },
                                    }) => {
                                        const startsAt = getValues('startsAt');

                                        return (
                                            <MtvRoomCreationFormDatePicker
                                                date={value}
                                                minimiumDate={startsAt}
                                                title="Ends at"
                                                onConfirm={onChange}
                                                testID="ends-at-datetime-picker"
                                            />
                                        );
                                    }}
                                    name="endsAt"
                                    defaultValue={physicalConstraintEndsAt}
                                />
                                {errors.endsAt && (
                                    <Text sx={{ color: 'red', marginTop: 's' }}>
                                        {errors.endsAt.message}
                                    </Text>
                                )}
                            </View>
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
