import { Skeleton } from '@motify/skeleton';
import {
    LatlngCoords,
    MtvRoomGetRoomConstraintDetailsCallbackArgs,
} from '@musicroom/types';
import { View, Text } from 'dripsy';
import React, { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationObject } from 'expo-location';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import { MusicTrackVoteChatModalProps } from '../types';
import PositionConstraintsDetailsOnMap from '../components/Maps';
import { useUserContext } from '../hooks/userHooks';

interface RoomConstraintsDetailsPreviewProps {
    constraintsDetails: MtvRoomGetRoomConstraintDetailsCallbackArgs;
    devicePosition?: LatlngCoords;
    roomName: string;
}

const RoomConstraintsDetailsPreview: React.FC<RoomConstraintsDetailsPreviewProps> =
    ({
        constraintsDetails: {
            physicalConstraintStartsAt,
            physicalConstraintEndsAt,
            physicalConstraintPosition,
            physicalConstraintRadius,
            roomID,
        },
        devicePosition,
        roomName,
    }) => {
        return (
            <View
                style={{
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <PositionConstraintsDetailsOnMap
                    positionConstraintPosition={physicalConstraintPosition}
                    devicePosition={devicePosition}
                    positionConstraintRadius={physicalConstraintRadius}
                    defaultZoom={11}
                />
            </View>
        );
    };

const MusicTrackVoteConstraintsDetailsModal: React.FC<MusicTrackVoteChatModalProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();

        const {
            userState: {
                context: { location },
            },
        } = useUserContext();
        const devicePosition =
            location !== undefined
                ? {
                      lat: location.coords.latitude,
                      lng: location.coords.longitude,
                  }
                : undefined;

        const { musicPlayerState, sendToMusicPlayerMachine } =
            useMusicPlayerContext();
        const {
            hasTimeAndPositionConstraints,
            roomID,
            constraintsDetails,
            name: roomName,
        } = musicPlayerState.context;

        const displayLoader = constraintsDetails === undefined;
        const noCurrentRoom = roomID === '';
        const noCurrentRoomOrRoomDoesnotHaveConstraints =
            !hasTimeAndPositionConstraints || noCurrentRoom;

        // //tmp fastest to test
        // const fakeDevicePosition: LatlngCoords = {
        //     lat: 43.326645,
        //     lng: 5.441153,
        // };
        // const fakeConstraints: MtvRoomGetRoomConstraintDetailsCallbackArgs = {
        //     physicalConstraintEndsAt: '16h30 mercredi prochain',
        //     physicalConstraintPosition: {
        //         lat: 43.426645,
        //         lng: 5.441153,
        //     },
        //     physicalConstraintRadius: 1000,
        //     physicalConstraintStartsAt: 'Audjh midi',
        //     roomID: 'what ever',
        // };
        // return (
        //     <AppScreen>
        //         <AppScreenHeader
        //             title="userName profile"
        //             insetTop={insets.top}
        //             canGoBack={true}
        //             goBack={() => {
        //                 navigation.goBack();
        //             }}
        //         />

        //         <AppScreenContainer>
        //             <Skeleton show={false} colorMode="dark" width="100%">
        //                 {fakeConstraints !== undefined ? (
        //                     <RoomConstraintsDetailsPreview
        //                         devicePosition={fakeDevicePosition}
        //                         constraintsDetails={fakeConstraints}
        //                         roomName={roomName}
        //                     />
        //                 ) : undefined}
        //             </Skeleton>
        //         </AppScreenContainer>
        //     </AppScreen>
        // );

        useEffect(() => {
            if (noCurrentRoomOrRoomDoesnotHaveConstraints) {
                return;
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
        ]);

        if (noCurrentRoomOrRoomDoesnotHaveConstraints) {
            return (
                <AppScreen>
                    <AppScreenHeader
                        title="Music Track Vote Constraints"
                        insetTop={insets.top}
                        canGoBack={true}
                        goBack={() => {
                            navigation.goBack();
                        }}
                    />

                    <AppScreenContainer>
                        <Text>
                            Your room is not concerned about any constraints
                        </Text>
                    </AppScreenContainer>
                </AppScreen>
            );
        }

        return (
            <AppScreen>
                <AppScreenHeader
                    title="userName profile"
                    insetTop={insets.top}
                    canGoBack={true}
                    goBack={() => {
                        navigation.goBack();
                    }}
                />

                <AppScreenContainer>
                    <Skeleton
                        show={displayLoader}
                        colorMode="dark"
                        width="100%"
                    >
                        {constraintsDetails !== undefined ? (
                            <RoomConstraintsDetailsPreview
                                devicePosition={devicePosition}
                                constraintsDetails={constraintsDetails}
                                roomName={roomName}
                            />
                        ) : undefined}
                    </Skeleton>
                </AppScreenContainer>
            </AppScreen>
        );
    };

export default MusicTrackVoteConstraintsDetailsModal;
