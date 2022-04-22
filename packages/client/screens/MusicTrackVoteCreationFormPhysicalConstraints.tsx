import { useActor } from '@xstate/react';
import {
    isAfter,
    isEqual,
    addHours,
    setSeconds,
    setMilliseconds,
} from 'date-fns';
import { Text, useSx, View } from 'dripsy';
import React, { useMemo } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import PickerSelect from 'react-native-picker-select';
import urlcat from 'urlcat';
import { useTextFieldStyles } from '../components/kit/TextField';
import MtvRoomCreationFormDatePicker from '../components/MtvRoomCreationForm/MtvRoomCreationFormDatePicker';
import MtvRoomCreationFormOptionButton from '../components/MtvRoomCreationForm/MtvRoomCreationFormOptionButton';
import MtvRoomCreationFormScreen from '../components/MtvRoomCreationForm/MtvRoomCreationFormScreen';
import { GOOGLE_PLACES_API_KEY } from '../constants/ApiKeys';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { useCreationMtvRoomFormMachine } from '../hooks/musicPlayerHooks';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { MusicTrackVoteCreationFormPhysicalConstraintsScreenProps } from '../types';

export interface MusicTrackVoteCreationFormPhysicalConstraintsFormFieldValues {
    place: { id: string; label: string };
    radius: string;
    startsAt: Date;
    endsAt: Date;
}

interface MusicTrackVoteCreationFormPhysicalConstraintsContentProps {
    hasPhysicalConstraints: boolean;
    physicalConstraintStartsAt: Date;
    physicalConstraintEndsAt?: Date;
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
        const oneHourAfterInitialMounting = useMemo(() => {
            const now = setMilliseconds(setSeconds(new Date(), 0), 0);

            return addHours(now, 1);
        }, []);

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
        const availableRadii = [
            {
                key: '1',
                label: '1 km',
                value: '1000',
            },
            {
                key: '5',
                label: '5 km',
                value: '5000',
            },
            {
                key: '10',
                label: '10 km',
                value: '10000',
            },
        ];

        return (
            <MtvRoomCreationFormScreen
                testID="music-track-vote-creation-form-physical-constraints-screen"
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
                                            debounce={300}
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
                                                    label: 'Radius (in km)',
                                                    value: undefined,
                                                    color: '#9EA0A4',
                                                }}
                                                items={availableRadii}
                                                value={value}
                                                onValueChange={(radius) => {
                                                    if (radius === undefined) {
                                                        return;
                                                    }

                                                    const doesRadiusExist =
                                                        availableRadii.some(
                                                            ({
                                                                value: availableRadiusValue,
                                                            }) =>
                                                                availableRadiusValue ===
                                                                radius,
                                                        );
                                                    if (
                                                        doesRadiusExist === true
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

                                                isOneHourAfterFormBeginning: (
                                                    endsAt,
                                                ) => {
                                                    console.log(
                                                        'isOneHourAfterFormBeginning',
                                                        {
                                                            endsAt,
                                                            oneHourAfterInitialMounting,
                                                        },
                                                    );

                                                    const isOneHourAfterInitialMounting =
                                                        isAfter(
                                                            endsAt,
                                                            oneHourAfterInitialMounting,
                                                        ) ||
                                                        isEqual(
                                                            endsAt,
                                                            oneHourAfterInitialMounting,
                                                        );

                                                    return (
                                                        isOneHourAfterInitialMounting ||
                                                        'The event end date must be more than in one hour.'
                                                    );
                                                },
                                            },
                                        }}
                                        render={({
                                            field: { onChange, value },
                                        }) => {
                                            return (
                                                <MtvRoomCreationFormDatePicker
                                                    date={value}
                                                    minimiumDate={
                                                        oneHourAfterInitialMounting
                                                    }
                                                    title="Ends at"
                                                    onConfirm={onChange}
                                                    testID="ends-at-datetime-picker"
                                                />
                                            );
                                        }}
                                        name="endsAt"
                                        defaultValue={
                                            physicalConstraintEndsAt ??
                                            oneHourAfterInitialMounting
                                        }
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

export const MusicTrackVoteCreationFormPhysicalConstraints: React.FC<
    MusicTrackVoteCreationFormPhysicalConstraintsScreenProps & {
        mtvRoomCreationActor: CreationMtvRoomFormActorRef;
    }
> = ({ mtvRoomCreationActor }) => {
    const [state, send] = useActor(mtvRoomCreationActor);

    const hasPhysicalConstraints = state.hasTag('hasPhysicalConstraints');
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

    function handlePhysicalConstraintsValuesChange({
        radius,
        ...args
    }: {
        placeID: string;
        place: string;
        radius: string;
        startsAt: Date;
        endsAt: Date;
    }) {
        send({
            type: 'SET_PHYSICAL_CONSTRAINTS_VALUES_AND_GO_NEXT',
            radius: Number(radius),
            ...args,
        });
    }

    function handleGoBack() {
        send({
            type: 'GO_BACK',
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
                const fieldsAreEmpty =
                    place === undefined ||
                    startsAt === undefined ||
                    endsAt === undefined;
                if (fieldsAreEmpty) {
                    send({
                        type: 'NEXT',
                    });

                    return;
                }

                const { id, label } = place;
                handlePhysicalConstraintsValuesChange({
                    placeID: id,
                    place: label,
                    radius,
                    startsAt,
                    endsAt,
                });
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
