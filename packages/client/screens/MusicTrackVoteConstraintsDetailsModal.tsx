import { Skeleton } from '@motify/skeleton';
import {
    LatlngCoords,
    MtvRoomGetRoomConstraintDetailsCallbackArgs,
} from '@musicroom/types';
import { View, ScrollView, useSx, Text } from 'dripsy';
import React, { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions, TouchableOpacity } from 'react-native';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    Typo,
} from '../components/kit';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import { MusicTrackVoteChatModalProps } from '../types';
import PositionConstraintsDetailsOnMap from '../components/MtvRoomConstraintsDetailsOnMap';
import { useUserContext } from '../hooks/userHooks';
import {
    formatDateTime,
    parseIsoDateTimeString,
} from '../hooks/useFormatDateTime';
import ErrorScreen from './kit/ErrorScreen';

interface RoomConstraintsDetailsPreviewProps {
    constraintsDetails: MtvRoomGetRoomConstraintDetailsCallbackArgs;
    devicePosition?: LatlngCoords;
    roomName: string;
    userFitsPositionConstraint?: boolean | null;
    RequestLocationPermissionButton: () => React.ReactElement | null;
}

const TimeConstraintLine: React.FC<{ maxWidth: string | number }> = ({
    children,
    maxWidth,
}) => (
    <View
        sx={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            maxWidth,
            width: '100%',
        }}
    >
        {children}
    </View>
);

const RoomConstraintsDetailsPreview: React.FC<RoomConstraintsDetailsPreviewProps> =
    ({
        constraintsDetails: {
            physicalConstraintStartsAt,
            physicalConstraintEndsAt,
            physicalConstraintPosition,
            physicalConstraintRadius,
        },
        devicePosition,
        userFitsPositionConstraint,
        RequestLocationPermissionButton,
    }) => {
        const height = Dimensions.get('window').height;
        const maxHeight = height / 2 > 400 ? 400 : height / 2;
        const maxWidth = 800;

        const parsedStartsAt = parseIsoDateTimeString(
            physicalConstraintStartsAt,
        );
        const readableStartsAt = formatDateTime(parsedStartsAt);

        const parsedEndsAt = parseIsoDateTimeString(physicalConstraintEndsAt);
        const readableEndsAt = formatDateTime(parsedEndsAt);
        return (
            <View
                sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <View
                    sx={{
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                    }}
                >
                    <TimeConstraintLine maxWidth={maxWidth}>
                        <Typo sx={{ fontSize: 's' }}>StartsAt:</Typo>
                        <Typo sx={{ fontSize: 's' }}>{readableStartsAt}</Typo>
                    </TimeConstraintLine>

                    <TimeConstraintLine maxWidth={maxWidth}>
                        <Typo sx={{ fontSize: 's' }}>EndsAt:</Typo>
                        <Typo sx={{ fontSize: 's' }}>{readableEndsAt}</Typo>
                    </TimeConstraintLine>
                </View>
                <View
                    sx={{
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        marginTop: 'm',
                    }}
                >
                    <Typo
                        sx={{
                            fontSize: 's',
                        }}
                    >
                        {userFitsPositionConstraint === true
                            ? 'You fit the room position constraint, at least one of your device is in the zone'
                            : 'You do not fit the room position constraint'}
                    </Typo>
                    <View
                        sx={{
                            width: '100%',
                            maxWidth,
                            height: maxHeight,
                            marginBottom: 'xl',
                        }}
                    >
                        <PositionConstraintsDetailsOnMap
                            positionConstraintPosition={
                                physicalConstraintPosition
                            }
                            devicePosition={devicePosition}
                            positionConstraintRadius={physicalConstraintRadius}
                            defaultZoom={11}
                        />
                    </View>

                    <RequestLocationPermissionButton />
                </View>
            </View>
        );
    };

const MusicTrackVoteConstraintsDetailsModal: React.FC<MusicTrackVoteChatModalProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();
        const sx = useSx();

        const {
            userState: {
                context: { location, locationPermission },
            },
            sendToUserMachine,
        } = useUserContext();
        const devicePosition =
            location !== undefined
                ? {
                      lat: location.coords.latitude,
                      lng: location.coords.longitude,
                  }
                : undefined;
        const locationPermissionIsNotGranted = !locationPermission;

        const { musicPlayerState, sendToMusicPlayerMachine } =
            useMusicPlayerContext();
        const {
            hasTimeAndPositionConstraints,
            roomID,
            constraintsDetails,
            name: roomName,
            userRelatedInformation,
        } = musicPlayerState.context;

        const displayLoader = constraintsDetails === undefined;
        const noCurrentRoom = roomID === '';
        const noCurrentRoomOrRoomDoesnotHaveConstraints =
            !hasTimeAndPositionConstraints || noCurrentRoom;

        useEffect(() => {
            if (noCurrentRoomOrRoomDoesnotHaveConstraints) {
                return;
            }

            if (locationPermissionIsNotGranted) {
                sendToUserMachine({
                    type: 'REQUEST_LOCATION_PERMISSION',
                });
            }

            if (constraintsDetails === undefined) {
                sendToMusicPlayerMachine({
                    type: 'GET_ROOM_CONSTRAINTS_DETAILS',
                });
            }
        }, [
            constraintsDetails,
            noCurrentRoomOrRoomDoesnotHaveConstraints,
            sendToMusicPlayerMachine,
            sendToUserMachine,
            locationPermissionIsNotGranted,
        ]);

        if (noCurrentRoomOrRoomDoesnotHaveConstraints) {
            return (
                <ErrorScreen
                    title="Music Track Vote Constraints"
                    message="Your room is not concerned about any constraints"
                />
            );
        }

        return (
            <AppScreen>
                <AppScreenHeader
                    title="Mtv Room Constraints"
                    insetTop={insets.top}
                    canGoBack={true}
                    goBack={() => {
                        navigation.goBack();
                    }}
                />

                <AppScreenContainer>
                    <ScrollView
                        sx={{
                            flex: 1,
                        }}
                    >
                        <Skeleton
                            show={displayLoader}
                            colorMode="dark"
                            width="100%"
                        >
                            {constraintsDetails !== undefined ? (
                                <RoomConstraintsDetailsPreview
                                    RequestLocationPermissionButton={() => {
                                        if (locationPermissionIsNotGranted) {
                                            return (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        sendToMusicPlayerMachine(
                                                            {
                                                                type: 'GET_ROOM_CONSTRAINTS_DETAILS',
                                                            },
                                                        );
                                                    }}
                                                    style={sx({
                                                        padding: 'l',
                                                        textAlign: 'center',
                                                        backgroundColor:
                                                            'greyLighter',
                                                        borderRadius: 's',
                                                        fontSize: 'm',
                                                        marginBottom: 'xl',
                                                    })}
                                                >
                                                    <Text
                                                        sx={{
                                                            color: 'greyLight',
                                                            fontSize: 'm',
                                                        }}
                                                    >
                                                        Get device position
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        }
                                        return null;
                                    }}
                                    userFitsPositionConstraint={
                                        userRelatedInformation?.userFitsPositionConstraint
                                    }
                                    devicePosition={devicePosition}
                                    constraintsDetails={constraintsDetails}
                                    roomName={roomName}
                                />
                            ) : undefined}
                        </Skeleton>
                    </ScrollView>
                </AppScreenContainer>
            </AppScreen>
        );
    };

export default MusicTrackVoteConstraintsDetailsModal;
