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
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { isAfter, isFuture } from 'date-fns';

interface MusicTrackVoteCreationFormPhysicalConstraintsFormFieldValues {
    place: { id: string; label: string };
    radius: number;
    startsAt: Date | undefined;
    endsAt: Date | undefined;
}

interface MusicTrackVoteCreationFormPhysicalConstraintsContentProps {
    hasPhysicalConstraints: boolean;
    physicalConstraintStartsAt: Date;
    physicalConstraintEndsAt: Date;
    handleSetPhysicalConstraintsStatus(isRestricted: boolean): () => void;
    handleGoBack: () => void;
    handleGoNext: SubmitHandler<MusicTrackVoteCreationFormPhysicalConstraintsFormFieldValues>;
}

export const MusicTrackVoteCreationFormPhysicalConstraintsContent: React.FC<MusicTrackVoteCreationFormPhysicalConstraintsContentProps> =
    ({
        hasPhysicalConstraints,
        physicalConstraintStartsAt,
        physicalConstraintEndsAt,
        handleSetPhysicalConstraintsStatus,
        handleGoBack,
        handleGoNext,
    }) => {
        const PLACES_API_PROXY_URL = urlcat(
            SERVER_ENDPOINT,
            '/proxy-places-api',
        );
        const {
            control,
            handleSubmit,
            getValues,
            formState: { errors },
        } = useForm<MusicTrackVoteCreationFormPhysicalConstraintsFormFieldValues>();
        const sx = useSx();
        const textFieldStyles = useTextFieldStyles();

        const physicalConstraintsOptions = [
            {
                text: 'Restrict',
                selected: hasPhysicalConstraints === true,
                onPress: handleSetPhysicalConstraintsStatus(true),
            },

            {
                text: 'No restriction',
                selected: hasPhysicalConstraints === false,
                onPress: handleSetPhysicalConstraintsStatus(false),
            },
        ];

        return (
            <MtvRoomCreationFormScreen
                title="Do you want to restrict voting right to physical constraints?"
                onBackButtonPress={handleGoBack}
                onNextButtonPress={handleSubmit(handleGoNext)}
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
                                            shouldApplyRightMargin={
                                                isNotLastButton
                                            }
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
                                    <View
                                        testID="place-errors-group"
                                        sx={{ marginTop: 's' }}
                                    >
                                        <Text
                                            accessibilityRole="alert"
                                            sx={{
                                                color: 'red',
                                            }}
                                        >
                                            A place must be set.
                                        </Text>
                                    </View>
                                )}

                                <Controller
                                    control={control}
                                    rules={{
                                        required: true,
                                    }}
                                    render={({
                                        field: { onChange, value },
                                    }) => {
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
                                                useNativeAndroidPickerStyle={
                                                    false
                                                }
                                                style={
                                                    {
                                                        inputIOS: [
                                                            sx({
                                                                marginTop: 'm',
                                                                paddingRight:
                                                                    'xl',
                                                            }),
                                                            textFieldStyles,
                                                        ],

                                                        inputAndroid: [
                                                            sx({
                                                                marginTop: 'm',
                                                                paddingRight:
                                                                    'xl',
                                                            }),
                                                            textFieldStyles,
                                                        ],

                                                        inputWeb: [
                                                            sx({
                                                                marginTop: 'm',
                                                                paddingRight:
                                                                    'xl',
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
                                    <View
                                        testID="radius-errors-group"
                                        sx={{ marginTop: 's' }}
                                    >
                                        <Text
                                            accessibilityRole="alert"
                                            sx={{ color: 'red' }}
                                        >
                                            A radius must be set.
                                        </Text>
                                    </View>
                                )}

                                <View sx={{ marginTop: 'm' }}>
                                    <Controller
                                        control={control}
                                        rules={{
                                            validate: {
                                                isRequired: (startsAt) => {
                                                    return (
                                                        startsAt !==
                                                            undefined ||
                                                        'The start date is required.'
                                                    );
                                                },

                                                isFuture: (startsAt) => {
                                                    if (
                                                        startsAt === undefined
                                                    ) {
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
                                        defaultValue={
                                            physicalConstraintStartsAt
                                        }
                                    />
                                    {errors.startsAt && (
                                        <View
                                            testID="start-at-errors-group"
                                            sx={{ marginTop: 's' }}
                                        >
                                            <Text
                                                accessibilityRole="alert"
                                                sx={{
                                                    color: 'red',
                                                }}
                                            >
                                                {errors.startsAt.message}
                                            </Text>
                                        </View>
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
                                                        isAfter(
                                                            endsAt,
                                                            startsAt,
                                                        ) ||
                                                        'The event end date must be after its beginning.'
                                                    );
                                                },
                                            },
                                        }}
                                        render={({
                                            field: { onChange, value },
                                        }) => {
                                            const startsAt =
                                                getValues('startsAt');

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
                                        <View
                                            testID="ends-at-errors-group"
                                            sx={{ marginTop: 's' }}
                                        >
                                            <Text
                                                accessibilityRole="alert"
                                                sx={{
                                                    color: 'red',
                                                }}
                                            >
                                                {errors.endsAt.message}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </>
                }
            />
        );
    };

const MusicTrackVoteCreationFormPhysicalConstraints: React.FC<
    MusicTrackVoteCreationFormPhysicalConstraintsScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ mtvRoomCreationActor }) => {
    const [state, send] = useActor(mtvRoomCreationActor);

    const hasPhysicalConstraints = state.hasTag('hasPhysicalConstraints');
    const physicalConstraintRadius = state.context.physicalConstraintRadius;
    const physicalConstraintStartsAt = state.context.physicalConstraintStartsAt;
    const physicalConstraintEndsAt = state.context.physicalConstraintEndsAt;

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
        <MusicTrackVoteCreationFormPhysicalConstraintsContent
            hasPhysicalConstraints={hasPhysicalConstraints}
            physicalConstraintStartsAt={physicalConstraintStartsAt}
            physicalConstraintEndsAt={physicalConstraintEndsAt}
            handleSetPhysicalConstraintsStatus={
                handleSetPhysicalConstraintsStatus
            }
            handleGoBack={handleGoBack}
            handleGoNext={({ place, radius, startsAt, endsAt }) => {
                if (place !== undefined) {
                    handlePhysicalConstraintPlaceChange(place.id, place.label);
                }

                handlePhysicalConstraintRadiusChange(String(radius));

                if (startsAt !== undefined) {
                    handlePhysicalConstraintStartsAtChange(startsAt);
                }
                if (endsAt !== undefined) {
                    handlePhysicalConstraintEndsAtChange(endsAt);
                }

                handleGoNext();
            }}
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
